import { cpus, freemem, loadavg } from 'node:os';
import { lstat, opendir, realpath, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { hashFile, inside, isMissing, readReceipts, signature, type Config, type Receipt, type Receipts, type Status } from './config.ts';

type Source = { path: string; signature: string; mtime: number };
type Attempt = { signature: string; count: number; after: number; failed: boolean; code?: number };
const RETRY_MS = [5000, 15000, 30000, 60000, 120000];

/** Disk metadata and Funes receipts are the durable queue; lifecycle events are hints only. */
export class Scheduler {
  private stopped = false;
  private running = false;
  private rerun = false;
  private timer?: Timer;
  private child?: ChildProcess;
  private hints = new Map<string, number>();
  private attempts = new Map<string, Attempt>();
  private served = new Map<string, number>();
  private receipts: Receipts = {};
  private sources: Source[] = [];
  private discoveryErrors: string[] = [];
  private dependencySignatures = new Map<string, string | null>();
  private started = Date.now();
  private busyUntil = 0;
  private status: Status;
  private verifiedBinarySignature?: string;

  constructor(private config: Config, private changed: (status: Status) => void) {
    this.status = {phase:'checking',operation:'discover',roots:config.roots,pending:0,scanner:'unknown',detail:'Reconciling persisted coverage; index existence is not known yet.'};
  }

  start(): void {
    this.stopped = false;
    this.changed(this.snapshot());
    this.request();
  }

  request(file?: string): void {
    if (this.stopped) return;
    if (file && this.config.roots.some(root => inside(resolve(file), root))) this.hints.set(resolve(file), Date.now());
    this.rerun = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.running) queueMicrotask(() => { void this.drain(); });
  }

  retry(): void {
    this.attempts.clear();
    this.busyUntil = 0;
    this.request();
  }

  snapshot(): Status { return {...this.status}; }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    const child = this.child;
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>(done => {
        const deadline = setTimeout(() => { child.kill('SIGKILL'); done(); }, 2000);
        child.once('close', () => { clearTimeout(deadline); done(); });
      });
    }
  }

  private publish(extra: Partial<Status> = {}): void {
    const pending = this.sources.filter(s => !this.current(s));
    const failed = pending.find(s => this.attempts.get(s.path)?.failed);
    const relevant = this.sources.flatMap(s => this.receipts[s.path] ? [this.receipts[s.path]!] : []);
    const latest = relevant.map(r => r.indexed_at).sort().at(-1);
    const scanner = relevant.length === 0 ? 'unknown' : relevant.every(r => r.scanner === 'scanned') ? 'scanned' : relevant.every(r => r.scanner === 'unavailable') ? 'unavailable' : relevant.every(r => r.scanner === 'failed') ? 'failed' : 'mixed';
    const incomplete = pending.some(s => this.receipts[s.path]?.issues.some(issue => issue !== 'chunk-budget' && issue !== 'source-changed'));
    this.status = {
      phase: failed || this.discoveryErrors.length ? 'failed' : pending.length === 0 ? 'current' : incomplete || this.busyUntil > Date.now() ? 'stale' : relevant.length === 0 ? 'never-indexed' : 'catching-up',
      operation:'idle', roots:this.config.roots, pending:pending.length,
      scanner, lastSuccess:latest,
      ...(failed ? {source:failed.path,exitCode:this.attempts.get(failed.path)?.code,detail:'Index failed; bounded retries pending or exhausted. Use /funes-retry.'} : {}),
      ...(incomplete ? {detail:'Source coverage incomplete; missing results do not prove absence.'} : {}),
      ...(this.discoveryErrors.length ? {detail:`Source discovery failed (${this.discoveryErrors.length} paths); coverage incomplete.`} : {}),
      ...extra,
    };
    this.changed(this.snapshot());
  }

  private current(source: Source): boolean {
    const receipt = this.receipts[source.path];
    return receipt?.complete === true && receipt.signature === source.signature
      && receipt.dependencies.every(d => d.signature !== null && this.dependencySignatures.get(d.path) === d.signature);
  }

  private async discover(): Promise<void> {
    const found: Source[] = [];
    const visited = new Set<string>();
    this.discoveryErrors = [];
    for (const root of this.config.roots) {
      try {
        // Enrollment pins the canonical path; replacing a root with a symlink cannot widen scope.
        if (await realpath(root) !== root || (await lstat(root)).isSymbolicLink()) throw new Error('Root changed');
        const dirs = [root];
        while (dirs.length && !this.stopped) {
          const dir = dirs.pop()!;
          if (visited.has(dir)) continue;
          visited.add(dir);
          try {
            for await (const item of await opendir(dir)) {
              if (this.stopped) return;
              const path = join(dir, item.name);
              if (item.isSymbolicLink()) continue;
              if (item.isDirectory()) dirs.push(path);
              else if (item.isFile() && item.name.endsWith('.jsonl')) {
                try {
                  const s = await stat(path, {bigint:true});
                  found.push({path,signature:`${s.size}:${s.mtimeNs}:${s.ctimeNs}:${s.ino}`,mtime:Number(s.mtimeMs)});
                } catch (error) { if (!isMissing(error)) this.discoveryErrors.push(path); }
              }
            }
          } catch { this.discoveryErrors.push(dir); }
        }
      } catch { this.discoveryErrors.push(root); }
    }
    this.sources = found;
    this.receipts = await readReceipts(this.config.memoryHome);
    if (Object.values(this.receipts).some(r => r.chunks > 0)) {
      try { await stat(join(this.config.memoryHome,'memory','chunks.lance','_versions')); }
      catch (error) {
        if (!isMissing(error)) throw error;
        // A removed derived dataset invalidates its old receipts; Funes rebuilds from originals.
        this.receipts = {};
      }
    }
    this.dependencySignatures = new Map(found.map(s => [s.path,s.signature]));
    for (const receipt of Object.values(this.receipts)) {
      for (const dependency of receipt.dependencies) {
        if (!this.dependencySignatures.has(dependency.path)) {
          // Metadata only, never enroll/index an external provenance reference.
          this.dependencySignatures.set(dependency.path, await signature(dependency.path).catch(() => null));
        }
      }
    }
    const paths = new Set(found.map(s => s.path));
    for (const [path, attempt] of this.attempts) {
      const source = found.find(s => s.path === path);
      if (!source || source.signature !== attempt.signature || this.current(source)) this.attempts.delete(path);
    }
    for (const path of this.hints.keys()) if (!paths.has(path) || this.current(found.find(s => s.path === path)!)) this.hints.delete(path);
    for (const path of this.served.keys()) if (!paths.has(path)) this.served.delete(path);
  }

  private choose(): Source | undefined {
    const now = Date.now();
    const pending = this.sources.filter(s => !this.current(s) && (this.attempts.get(s.path)?.after ?? 0) <= now);
    pending.sort((a,b) => {
      const ap = this.hints.has(a.path) || a.mtime >= this.started ? 1 : 0;
      const bp = this.hints.has(b.path) || b.mtime >= this.started ? 1 : 0;
      return bp-ap || (this.served.get(a.path) ?? 0)-(this.served.get(b.path) ?? 0) || b.mtime-a.mtime || a.path.localeCompare(b.path);
    });
    return pending[0];
  }

  private async index(source: Source): Promise<number> {
    // Recheck authorization immediately before passing a source to the parser; no shell expansion.
    if (await realpath(source.path) !== source.path || !this.config.roots.some(root => inside(source.path, root))) throw new Error('Source boundary changed');
    const before = await signature(source.path);
    if (this.stopped) return 128;
    if (before !== source.signature) { this.rerun = true; return 75; }
    this.publish({operation:'index',source:source.path});
    return new Promise<number>(done => {
      const child = spawn('/usr/bin/nice', ['-n','19',this.config.funesBin,'index',source.path,'--harness','omp','--yes','--omp-max-chunks',String(this.config.maxChunks)], {
        env:{...process.env,FUNES_HOME:this.config.memoryHome,RAYON_NUM_THREADS:'1',TOKIO_WORKER_THREADS:'2',NO_COLOR:'1'},
        stdio:['ignore','ignore','ignore'],
      });
      this.child = child;
      let settled = false;
      const finish = (code: number) => { if (!settled) { settled = true; this.child = undefined; done(code); } };
      child.once('error', () => finish(127));
      child.once('close', code => finish(code ?? 128));
    });
  }

  private async drain(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      const binarySignature = await signature(this.config.funesBin);
      if (binarySignature !== this.verifiedBinarySignature) {
        if (await hashFile(this.config.funesBin) !== this.config.binarySha256) throw new Error('Pinned Funes binary changed');
        this.verifiedBinarySignature = binarySignature;
      }
      do {
        this.rerun = false;
        await this.discover();
        if (this.stopped) break;
        this.publish();
        const source = this.choose();
        if (!source) break;
        // Measurements are recorded in SPEC.md; interactive OMP owns resource priority.
        if (loadavg()[0]! > cpus().length * 0.85 || freemem() < 1024 ** 3) {
          this.publish({phase:'stale',detail:'Index paused for system contention; searchable coverage is lagging.'});
          break;
        }
        if (Date.now() < this.busyUntil) break;
        const code = await this.index(source);
        if (this.stopped) break;
        this.served.set(source.path, Date.now());
        this.hints.delete(source.path);
        this.receipts = await readReceipts(this.config.memoryHome);
        const receipt: Receipt | undefined = this.receipts[source.path];
        if (code === 75) {
          this.busyUntil = Date.now() + 1000 + process.pid % 1000;
          this.publish({phase:'stale',operation:'index',source:source.path,exitCode:75,detail:'Destination writer busy; refresh retained.'});
          break;
        }
        this.busyUntil = 0;
        if (code !== 0 || !receipt) {
          const count = (this.attempts.get(source.path)?.count ?? 0) + 1;
          this.attempts.set(source.path,{signature:source.signature,count,after:count > RETRY_MS.length ? Infinity : Date.now() + RETRY_MS[count-1]!,failed:true,code:code || 65});
        } else if (!receipt.complete && !receipt.issues.every(issue => issue === 'chunk-budget' || issue === 'source-changed')) {
          this.attempts.set(source.path,{signature:source.signature,count:0,after:Date.now()+30000,failed:false});
        } else {
          this.attempts.delete(source.path);
        }
        // Every pass re-enumerates: child sessions need no hooks; final arrivals cannot be lost.
        this.rerun = true;
        await new Promise<void>(done => setTimeout(done, 25));
      } while (this.rerun && !this.stopped);
    } catch {
      this.publish({phase:'failed',detail:'Bridge reconciliation failed; coverage unknown. No transcript output is logged.'});
    } finally {
      this.running = false;
      if (!this.stopped) {
        const delay = this.busyUntil > Date.now() ? this.busyUntil-Date.now() : this.config.pollMs;
        this.timer = setTimeout(() => { this.timer = undefined; void this.drain(); }, delay);
        this.timer.unref();
      }
    }
  }
}
