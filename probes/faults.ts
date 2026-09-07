import assert from 'node:assert/strict';
import { appendFile, readFile, truncate, unlink, watch, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readReceipts, signature } from '../src/config.ts';

const root=process.env.PROBE_ROOT!;
const binary=process.env.FUNES_BIN!;
const omp=process.env.OMP_BIN!;
assert(root && binary && omp,'Explicit isolated probe paths required');
const fixture=await Bun.file(join(root,'fixtures.json')).json();
const parent=fixture.sessions.find((s:{kind:string}) => s.kind==='parent');
const home=join(root,'memory');
const environment={...process.env,FUNES_HOME:home,RAYON_NUM_THREADS:'1',TOKIO_WORKER_THREADS:'2'};
async function index(extra:Record<string,string>={}): Promise<{code:number;stdout:string;stderr:string}> {
  const child=Bun.spawn([binary,'index',parent.file,'--harness','omp','--yes','--omp-max-chunks','128'],{env:{...environment,...extra},stdin:'ignore',stdout:'pipe',stderr:'pipe'});
  const [code,stdout,stderr]=await Promise.all([child.exited,new Response(child.stdout).text(),new Response(child.stderr).text()]);
  return {code,stdout,stderr};
}
async function append(text:string): Promise<void> {
  const textFile=join(root,`append-${crypto.randomUUID()}.txt`);
  await Bun.write(textFile,text);
  const child=Bun.spawn([omp,'--model','openai/gpt-4o-mini','--no-extensions','--no-skills','--no-rules','--no-title','--no-lsp','--no-tools','-e',resolve(import.meta.dir,'fixtures.ts'),'-p','synthetic'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'synthetic-not-a-key',PI_CODING_AGENT_DIR:join(root,'fixture-agent'),PROBE_ACTION:'append',PROBE_FILE:parent.file,PROBE_TEXT_FILE:textFile},stdout:'pipe',stderr:'pipe'});
  const [code,out,err]=await Promise.all([child.exited,new Response(child.stdout).text(),new Response(child.stderr).text()]);
  await unlink(textFile);
  assert.equal(code,0,err||out);
}
async function receipt() {return (await readReceipts(home))[parent.file]!;}
async function drain(): Promise<void> {
  for(let i=0;i<30;i++) {const result=await index();assert.equal(result.code,0,result.stderr);if((await receipt()).complete)return;}
  throw new Error('Bounded indexing did not converge');
}
assert.equal((await index()).code,0);
const initial=await receipt();
const original=await readFile(parent.file);
await append('TRAILING_RECORD_RECOVERED_721: preserve completed bytes, never acknowledge an unfinished JSONL record.');
const full=await readFile(parent.file);
const cut=original.length+Math.floor((full.length-original.length)/2);
await truncate(parent.file,cut);
assert.equal((await index()).code,0);
const partial=await receipt();
assert.equal(partial.complete,false);
assert(partial.issues.some(s=>s.includes('incomplete final')));
await appendFile(parent.file,full.subarray(cut));
await drain();
const recovered=await receipt();
assert(recovered.chunks>initial.chunks);
assert.equal(recovered.signature,await signature(parent.file));
assert.equal((await index()).code,0);
assert.equal((await receipt()).chunks,recovered.chunks,'Unchanged input duplicated chunks');

// Stop a real writer after it removes the old receipt, while it still owns the OS memory lock.
async function interrupted(kill:boolean): Promise<void> {
  await append(`INTERRUPTION_${kill ? 'KILL' : 'ARRIVAL'}_861 `+'A historical discussion about durable local records and atomic checkpoints. '.repeat(1800));
  const controller=new AbortController();
  let paused!:()=>void;
  const stopped=new Promise<void>(resolve=>{paused=resolve;});
  let child: Bun.Subprocess | undefined;
  const observer=(async()=>{
    try {
      for await(const event of watch(home,{signal:controller.signal})) {
        if(event.filename!=='omp-coverage.json' || !child)continue;
        if(!(await readReceipts(home))[parent.file]) {child.kill('SIGSTOP');paused();return;}
      }
    } catch(error) {if(!controller.signal.aborted)throw error;}
  })();
  child=Bun.spawn([binary,'index',parent.file,'--harness','omp','--yes','--omp-max-chunks','2'],{env:environment,stdin:'ignore',stdout:'pipe',stderr:'pipe'});
  const out=new Response(child.stdout).text(),err=new Response(child.stderr).text();
  await Promise.race([stopped,Bun.sleep(10000).then(()=>{throw new Error('Writer did not expose invalidated receipt');})]);
  const competing=await index();
  assert.equal(competing.code,75,'Concurrent writer must report contention');
  const reader=Bun.spawn([binary,'get',parent.id],{env:environment,stdout:'pipe',stderr:'pipe'});
  const [readerCode,readerText]=await Promise.all([reader.exited,new Response(reader.stdout).text()]);
  assert.equal(readerCode,0);
  assert(readerText.includes('SQLite'),'Reader lost committed content during writer contention');
  if(kill) child.kill('SIGKILL');
  else {await append('FINAL_ARRIVAL_649 after the active writer captured its source snapshot.');child.kill('SIGCONT');}
  const exit=await child.exited;
  await Promise.all([out,err]);
  controller.abort();await observer;
  if(!kill) {assert.equal(exit,0);assert.equal((await receipt()).complete,false);}
  await drain();
  assert.equal((await receipt()).signature,await signature(parent.file));
}
await interrupted(false);
await interrupted(true);
await append('SCANNER_FAILURE_CONTINUES_431 local indexing remains usable and explicitly unscanned.');
const failedScan=await index({FUNES_TRUFFLEHOG:'/bin/false'});
assert.equal(failedScan.code,0);
assert(['failed','mixed'].includes((await receipt()).scanner));
const recursion=[];
for(let cycle=0;cycle<3;cycle++) {
  const query=Bun.spawn([binary,'recall','Cerulean SQLite offline kiosk','--k','1'],{env:environment,stdout:'pipe',stderr:'pipe'});
  const text=await new Response(query.stdout).text();
  assert.equal(await query.exited,0);
  await append(`Historical recall cycle ${cycle}: ${text}`);
  await drain();recursion.push((await receipt()).chunks);
  assert.equal((await index()).code,0);
  assert.equal((await receipt()).chunks,recursion.at(-1));
}
const result={partialTail:partial.issues,idempotent:true,concurrentWriterExit:75,liveReaderDuringWriter:true,interruptedRecovery:true,finalArrivalRecovered:true,scanner:(await receipt()).scanner,recursionChunks:recursion,finalChunks:(await receipt()).chunks};
await writeFile(join(root,'faults-proof.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
