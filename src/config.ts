import { lstat, mkdir, realpath, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const OWNER = 'omp-funes-bridge';
export const OMP_VERSION = '18.1.13';
export const FUNES_REVISION = '90507de6bf4a8bedd32aa8acfc0502483d82fbdf';
export const CONFIG_NAME = 'funes-bridge.json';
export const SERVER_NAME = 'funes_bridge';
export interface Config {
  version: 1;
  agentDir: string;
  roots: string[];
  memoryHome: string;
  funesBin: string;
  binarySha256: string;
  pollMs: number;
  maxChunks: number;
}
export type Scanner = 'scanned' | 'unavailable' | 'failed' | 'mixed';
export interface Receipt {
  signature: string;
  complete: boolean;
  issues: string[];
  session_id: string;
  messages: number;
  chunks: number;
  scanner: Scanner;
  indexed_at: string;
  dependencies: {path: string; signature: string | null}[];
}
export type Receipts = Record<string, Receipt>;
export type Phase = 'checking' | 'never-indexed' | 'catching-up' | 'current' | 'stale' | 'failed';
export interface Status {
  phase: Phase;
  operation: 'discover' | 'index' | 'idle';
  roots: string[];
  pending: number;
  source?: string;
  exitCode?: number;
  lastSuccess?: string;
  scanner: Scanner | 'unknown';
  detail?: string;
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value as Record<string, unknown>;
}
function absolute(value: unknown): string {
  if (typeof value !== 'string' || !isAbsolute(value)) throw new Error('Expected an absolute local path');
  return resolve(value);
}
export function parseConfig(value: unknown): Config {
  const v = object(value);
  if (v.version !== 1 || !Array.isArray(v.roots) || v.roots.length === 0 || typeof v.binarySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.binarySha256)) throw new Error('Unsupported bridge configuration');
  const pollMs = v.pollMs;
  const maxChunks = v.maxChunks;
  if (!Number.isInteger(pollMs) || typeof pollMs !== 'number' || pollMs < 1000 || pollMs > 30000) throw new Error('pollMs must be 1000..30000');
  if (!Number.isInteger(maxChunks) || typeof maxChunks !== 'number' || maxChunks < 1 || maxChunks > 128) throw new Error('maxChunks must be 1..128');
  return {version:1, agentDir:absolute(v.agentDir), roots:[...new Set(v.roots.map(absolute))], memoryHome:absolute(v.memoryHome), funesBin:absolute(v.funesBin), binarySha256:v.binarySha256, pollMs, maxChunks};
}
export async function readConfig(path: string): Promise<Config> {
  return parseConfig(await Bun.file(path).json());
}
export async function readReceipts(home: string): Promise<Receipts> {
  const file = Bun.file(join(home, 'omp-coverage.json'));
  if (!await file.exists()) return {};
  const document = object(await file.json());
  if (document.version !== 1) throw new Error('Unsupported Funes coverage version');
  const units = object(document.units);
  const result: Receipts = {};
  for (const [path, entry] of Object.entries(units)) {
    const v = object(entry);
    if (!isAbsolute(path) || typeof v.signature !== 'string' || typeof v.complete !== 'boolean' || !Array.isArray(v.issues) || !v.issues.every(s => typeof s === 'string') || typeof v.session_id !== 'string' || typeof v.messages !== 'number' || typeof v.chunks !== 'number' || typeof v.indexed_at !== 'string' || typeof v.scanner !== 'string' || !['scanned','unavailable','failed','mixed'].includes(v.scanner)) throw new Error('Invalid Funes coverage receipt');
    if (v.policy !== 'omp-text-graph-v2' || !Array.isArray(v.dependencies)) continue;
    const dependencies = v.dependencies.map(value => {
      const dependency = object(value);
      if (dependency.signature !== null && typeof dependency.signature !== 'string') throw new Error('Invalid provenance dependency');
      return {path:absolute(dependency.path),signature:dependency.signature};
    });
    result[path] = {signature:v.signature,complete:v.complete,issues:v.issues,session_id:v.session_id,messages:v.messages,chunks:v.chunks,scanner:v.scanner as Scanner,indexed_at:v.indexed_at,dependencies};
  }
  return result;
}
export function inside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
export async function signature(path: string): Promise<string> {
  const s = await stat(path, {bigint:true});
  return `${s.size}:${s.mtimeNs}:${s.ctimeNs}:${s.ino}`;
}
/** Resolve missing leaf paths without silently following a future root symlink. */
export async function canonical(path: string): Promise<string> {
  const resolved = resolve(path);
  try { return await realpath(resolved); }
  catch (error) {
    if (!isMissing(error)) throw error;
    if (dirname(resolved) === resolved) throw error;
    return join(await canonical(dirname(resolved)), basename(resolved));
  }
}
export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
export async function assertNoSymlink(path: string): Promise<void> {
  try { if ((await lstat(path)).isSymbolicLink()) throw new Error('Refusing to replace a symlink'); }
  catch (error) { if (!isMissing(error)) throw error; }
}
export async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), {recursive:true,mode:0o700});
  await assertNoSymlink(path);
  const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await Bun.write(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode:0o600});
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(error => { if (!isMissing(error)) throw error; }); }
}
export async function hashFile(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  for await (const bytes of Bun.file(path).stream()) hasher.update(bytes);
  return hasher.digest('hex');
}
