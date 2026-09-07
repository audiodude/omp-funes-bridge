import assert from 'node:assert/strict';
import { copyFile, mkdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { hashFile, readConfig, type Status } from '../src/config.ts';
import { Scheduler } from '../src/scheduler.ts';
const root=process.env.PROBE_ROOT!;
assert(root && process.env.PROBE_CONFIG && process.env.PROBE_FIXTURE,'Explicit isolated probe paths required');
const configured=await readConfig(process.env.PROBE_CONFIG);
const falseBin=await realpath('/bin/false');
const archive=join(root,'archive');
await mkdir(archive,{recursive:true});
await copyFile(process.env.PROBE_FIXTURE,join(archive,'native.jsonl'));
const config={...configured,roots:[archive],memoryHome:join(root,'empty-memory'),funesBin:falseBin,binarySha256:await hashFile(falseBin),pollMs:1000};
let status: Status | undefined;
let launches=0;
let failureTransitions=0;
let lastPhase='never-indexed';
const times:number[]=[];
const started=Date.now();
const scheduler=new Scheduler(config,next=>{
  if(next.operation==='index') {launches++;times.push(Date.now()-started);}
  if(next.phase==='failed' && lastPhase!=='failed') failureTransitions++;
  lastPhase=next.phase;status=next;
});
async function until(check:()=>boolean): Promise<void> {
  const deadline=Date.now()+300000;
  while(!check()) {assert(Date.now()<deadline,JSON.stringify({launches,status}));await Bun.sleep(20);}
}
try {
  scheduler.start();
  // One initial attempt plus five bounded automatic retries for each source.
  await until(()=>launches>=6 && status?.phase==='failed');
  const exhausted=launches;
  await Bun.sleep(12000);
  assert.equal(launches,exhausted,'Automatic retries continued after exhaustion');
  assert.equal(failureTransitions,1,'Failure state cleared between failed retries');
  assert.equal(status?.phase,'failed');assert.equal(status?.exitCode,1);
  scheduler.retry();await until(()=>launches>exhausted && status?.phase==='failed');
  const result={attemptTimesMs:times,automaticAttempts:exhausted,persistentFailure:true,failureTransitionsBeforeManualRetry:1,manualRetryWorks:true};
  await Bun.write(join(root,'retries-proof.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally {await scheduler.stop();}
