import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CONFIG_NAME, inside, readConfig, readReceipts } from '../src/config.ts';
import { Scheduler } from '../src/scheduler.ts';

const root=process.env.PROBE_ROOT;
const omp=process.env.OMP_BIN;
const mode=process.env.PROBE_MODE ?? 'running';
assert(root && omp && ['running','reopen'].includes(mode),'Explicit isolated PROBE_ROOT, OMP_BIN and running/reopen mode required');
const config=await readConfig(join(root,'agent',CONFIG_NAME));
const fixture:{sessions:{file:string;kind:string}[]}=await Bun.file(join(root,'fixtures.json')).json();
const parent=fixture.sessions.find(s=>s.kind==='parent');
assert(parent && config.roots.some(r=>inside(parent.file,r)) && inside(parent.file,root),'Synthetic parent must be inside the explicit probe root and enrollment');
const marker=`search-proof-${crypto.randomUUID()}`;
const textFile=join(root,`${marker}.txt`);
let scheduler: Scheduler | undefined;
const started=performance.now();
try {
  await Bun.write(textFile,`Fresh persisted decision: preserve ${marker} in the local audit archive.`);
  const append=Bun.spawn([omp,'--model','openai/gpt-4o-mini','--no-session','--no-extensions','--no-skills','--no-rules','--no-title','--no-lsp','--no-tools','--extension',resolve(import.meta.dir,'fixtures.ts'),'-p','synthetic'],{
    cwd:root,env:{...process.env,OPENAI_API_KEY:'synthetic-not-a-key',PI_CODING_AGENT_DIR:join(root,'fixture-agent'),PROBE_ACTION:'append',PROBE_FILE:parent.file,PROBE_TEXT_FILE:textFile},stdout:'pipe',stderr:'pipe',
  });
  const [appendCode,appendError]=await Promise.all([append.exited,new Response(append.stderr).text(),new Response(append.stdout).text()]);
  assert.equal(appendCode,0,appendError);
  if (mode==='reopen') {scheduler=new Scheduler(config,()=>{});scheduler.start();}
  let attempts=0;
  while (true) {
    assert(performance.now()-started<180000,'Fresh persisted text was not searchable within three minutes');
    const query=Bun.spawn([config.funesBin,'recall',marker,'--memory',join(config.memoryHome,'memory'),'--k','1','--candidates','1','--neighbors','0'],{
      env:{...process.env,FUNES_HOME:config.memoryHome,RAYON_NUM_THREADS:'1',TOKIO_WORKER_THREADS:'2'},stdout:'pipe',stderr:'pipe',
    });
    const [code,text,error]=await Promise.all([query.exited,new Response(query.stdout).text(),new Response(query.stderr).text()]);
    assert.equal(code,0,error);attempts++;
    if (text.includes(marker)) break;
    await Bun.sleep(100);
  }
  const searchableMs=performance.now()-started;
  assert(searchableMs<180000);
  const receipts=await readReceipts(config.memoryHome);
  const pending=fixture.sessions.filter(s=>receipts[s.file]?.complete!==true).length;
  if (process.env.PROBE_REQUIRE_BACKFILL==='1') assert(pending>0,'Archive finished before this backfill searchability sample');
  const result={mode,marker,searchableMs,attempts,pendingArchiveSources:pending,measurement:'Includes native OMP append/startup and a real Funes ranked recall, not just a receipt or index exit'};
  await Bun.write(join(root,`searchable-${mode}.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally {
  await scheduler?.stop();
  await unlink(textFile);
}
