import assert from 'node:assert/strict';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { install } from '../src/install.ts';
import { Scheduler } from '../src/scheduler.ts';
import { readReceipts, signature, type Status } from '../src/config.ts';

const root = process.env.PROBE_ROOT!;
assert(root && process.env.OMP_BIN && process.env.FUNES_BIN,'Explicit isolated PROBE_ROOT/OMP_BIN/FUNES_BIN required');
const fixture = await Bun.file(join(root,'fixtures.json')).json();
const config = await install({agentDir:join(root,'agent'),roots:[fixture.archive],memoryHome:process.env.PROBE_MEMORY ?? join(root,'memory'),funesBin:process.env.FUNES_BIN,ompBin:process.env.OMP_BIN});
const clock = monitorEventLoopDelay({resolution:10});
clock.enable();
let maxFunesRssKiB = 0;
let maxIndexerRssKiB = 0;
let maxBridgeRssBytes = 0;
const sampler = setInterval(async () => {
  maxBridgeRssBytes = Math.max(maxBridgeRssBytes,process.memoryUsage().rss);
  for (const pid of (await readdir('/proc')).filter(s => /^\d+$/.test(s))) {
    try {
      if ((await readFile(`/proc/${pid}/comm`,'utf8')).trim() !== 'funes') continue;
      const status = await readFile(`/proc/${pid}/status`,'utf8');
      const rss=Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0);
      maxFunesRssKiB = Math.max(maxFunesRssKiB,rss);
      if (Number(status.match(/^PPid:\s+(\d+)/m)?.[1]) === process.pid) maxIndexerRssKiB=Math.max(maxIndexerRssKiB,rss);
    } catch {}
  }
},100);
const events: {at:number;phase:string;operation:string;pending:number;exitCode?:number}[] = [];
const started = performance.now();
let during: Promise<{file:string;persistedAt:number}> | undefined;
let state: Status | undefined;
async function append(file:string,text:string): Promise<{file:string;persistedAt:number}> {
  const textFile=join(root,`append-${crypto.randomUUID()}.txt`);
  await Bun.write(textFile,text);
  const child = Bun.spawn([process.env.OMP_BIN!,'--model','openai/gpt-4o-mini','--no-extensions','--no-skills','--no-rules','--no-title','--no-lsp','--no-tools','-e',resolve(import.meta.dir,'fixtures.ts'),'-p','synthetic'],{
    cwd:root,env:{...process.env,OPENAI_API_KEY:'synthetic-not-a-key',PI_CODING_AGENT_DIR:join(root,'fixture-agent'),PROBE_ACTION:'append',PROBE_FILE:file,PROBE_TEXT_FILE:textFile},stdout:'pipe',stderr:'pipe',
  });
  const [out,err,exit] = await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  await unlink(textFile);
  assert.equal(exit,0,err || out);
  return {file,persistedAt:performance.now()};
}
async function covered(file:string): Promise<boolean> {
  const receipt = (await readReceipts(config.memoryHome))[file];
  return receipt?.complete === true && receipt.signature === await signature(file);
}
async function until(condition:()=>Promise<boolean>|boolean,timeout=1200000): Promise<void> {
  const deadline = performance.now()+timeout;
  while (!await condition()) {
    assert(performance.now()<deadline,`Timed out; last status ${JSON.stringify(state)}`);
    await Bun.sleep(20);
  }
}
const scheduler = new Scheduler(config,status => {
  state=status;
  events.push({at:performance.now()-started,phase:status.phase,operation:status.operation,pending:status.pending,exitCode:status.exitCode});
  if (!during && status.operation === 'index' && status.source) during=append(status.source,'Fresh decision during initial import: amber-falcon-992 must be searchable before the archive finishes.');
});
try {
  scheduler.start();
  await until(() => Boolean(during));
  const arrival = await during!;
  await until(() => covered(arrival.file),180000);
  const duringBackfillMs = performance.now()-arrival.persistedAt;
  const pendingAtArrivalCoverage = state?.pending;
  await until(() => state?.phase === 'current' && state.operation === 'idle');
  const backfillMs = performance.now()-started;
  const parent = fixture.sessions.find((s:{kind:string}) => s.kind === 'parent');
  const warm = await append(parent.file,'Warm decision: violet-wren-773 preserves the offline checksum footer.');
  await until(() => covered(warm.file),180000);
  const warmUpdateMs = performance.now()-warm.persistedAt;
  await scheduler.stop();
  const closed = await append(parent.file,'Closed-session update: marigold-lynx-331 must catch up when OMP reopens.');
  const reopened = new Scheduler(config,status => {state=status;});
  const reopenedAt=performance.now();
  reopened.start();
  await until(() => covered(closed.file),180000);
  const reopenMs=performance.now()-reopenedAt;
  await reopened.stop();
  const receipts=await readReceipts(config.memoryHome);
  const results={fixtureSessions:fixture.sessions.length,sessions:new Set(Object.values(receipts).map(r=>r.session_id).filter(Boolean)).size,sources:Object.keys(receipts).length,completedMessages:Object.values(receipts).reduce((n,r)=>n+r.messages,0),chunks:Object.values(receipts).reduce((n,r)=>n+r.chunks,0),backfillMs,duringBackfillMs,pendingAtArrivalCoverage,warmUpdateMs,reopenMs,maxIndexerRssKiB,maxFunesRssKiB,maxBridgeRssBytes,eventLoopP95Ms:clock.percentile(95)/1e6,eventLoopP99Ms:clock.percentile(99)/1e6,events};
  await Bun.write(join(root,'benchmark.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({...results,events:events.length},null,2));
  assert(duringBackfillMs<180000 && warmUpdateMs<180000 && reopenMs<180000);
  assert(results.eventLoopP99Ms<100,'Interactive event loop delay exceeds benchmark acceptance');
  assert(maxIndexerRssKiB>0 && maxIndexerRssKiB<1024*1024,'Indexer RSS exceeds 1GiB benchmark acceptance or was not sampled');
} finally {await scheduler.stop();clearInterval(sampler);clock.disable();}
