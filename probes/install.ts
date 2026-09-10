import assert from 'node:assert/strict';
import { mkdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { install, uninstall } from '../src/install.ts';
import { hashFile, readReceipts } from '../src/config.ts';
import { Scheduler } from '../src/scheduler.ts';
const root=process.env.PROBE_ROOT!;
assert(root && process.env.OMP_BIN && process.env.FUNES_BIN && process.env.PROBE_FIXTURE,'Explicit isolated inputs required');
const agent=join(root,'agent');
const archive=join(root,'archive');
const outside=join(root,'not-enrolled');
await mkdir(agent,{recursive:true});await mkdir(archive,{recursive:true});await mkdir(outside,{recursive:true});
const unrelated={mcpServers:{existing_memory:{command:'/bin/true'}},disabledServers:['unrelated'],custom:{keep:true}};
await writeFile(join(agent,'mcp.json'),JSON.stringify(unrelated));
await writeFile(join(agent,'config.yml'),'memory:\n  backend: existing-backend\n');
const original=await readFile(process.env.PROBE_FIXTURE);
const transcript=join(archive,'native.jsonl');
await writeFile(transcript,original);
await writeFile(join(outside,'outside.jsonl'),original);
await symlink(join(outside,'outside.jsonl'),join(archive,'external.jsonl'));
const alias=join(root,'agent-alias');await symlink(agent,alias);
const options={agentDir:alias,roots:[archive],memoryHome:join(root,'memory'),funesBin:process.env.FUNES_BIN,ompBin:process.env.OMP_BIN};
const before=await hashFile(transcript);
// A formerly accepted CLI surface is insufficient: installation must reject a
// binary reporting a different committed build before writing any bridge state.
const staleBinary=join(root,'stale-funes');
const staleAgent=join(root,'stale-agent');
const staleMemory=join(root,'stale-memory');
await writeFile(staleBinary,`#!${process.execPath}
const args=process.argv.slice(2);
if(args[0]==='source') {
  const child=Bun.spawn([${JSON.stringify(process.env.FUNES_BIN)},...args],{stdin:new Blob([await Bun.stdin.text()]),stdout:'pipe',stderr:'ignore'});
  const response=await new Response(child.stdout).json();
  if(await child.exited!==0) process.exit(1);
  response.result.build_revision='0'.repeat(40);
  console.log(JSON.stringify(response));
} else {
  const child=Bun.spawn([${JSON.stringify(process.env.FUNES_BIN)},...args],{stdin:'inherit',stdout:'inherit',stderr:'inherit'});
  process.exit(await child.exited);
}
`,{mode:0o700});
try {
  await assert.rejects(install({...options,agentDir:staleAgent,memoryHome:staleMemory,funesBin:staleBinary}));
  assert.equal(await Bun.file(join(staleAgent,'funes-bridge.json')).exists(),false);
  assert.equal(await Bun.file(join(staleMemory,'bridge-owner.json')).exists(),false);
} finally { await unlink(staleBinary); }
const config=await install(options);
await install(options);
assert.equal(config.agentDir,agent);
const installed=await Bun.file(join(agent,'mcp.json')).json();
assert.deepEqual(installed.mcpServers.existing_memory,unrelated.mcpServers.existing_memory);
assert.deepEqual(installed.custom,unrelated.custom);
assert.equal(await Bun.file(join(agent,'config.yml')).text(),'memory:\n  backend: existing-backend\n');
let complete!:()=>void;
let fail!:(error:Error)=>void;
const finished=new Promise<void>((resolve,reject)=>{complete=resolve;fail=reject;});
const scheduler=new Scheduler(config,state=>{if(state.phase==='failed')fail(new Error(JSON.stringify(state)));if(state.phase==='current')complete();});
scheduler.start();
const deadline=setTimeout(()=>fail(new Error('Installation scheduler timed out')),90000);
try {await finished;} finally {clearTimeout(deadline);await scheduler.stop();}
const receipts=await readReceipts(config.memoryHome);
assert.deepEqual(Object.keys(receipts),[transcript]);
assert.equal(receipts[transcript]?.complete,true);
await writeFile(join(config.memoryHome,'keep-derived.txt'),'preserve derived memory');
await writeFile(join(agent,'extensions/omp-funes-bridge/user-added.txt'),'preserve unrelated user file');
await uninstall(alias);await uninstall(alias);
assert.equal(await hashFile(transcript),before);
assert.equal(await Bun.file(join(config.memoryHome,'keep-derived.txt')).text(),'preserve derived memory');
assert.equal(await Bun.file(join(agent,'extensions/omp-funes-bridge/user-added.txt')).text(),'preserve unrelated user file');
assert.deepEqual(await Bun.file(join(agent,'mcp.json')).json(),unrelated);
assert.equal(await Bun.file(join(agent,'funes-bridge.json')).exists(),false);
await assert.rejects(install({...options,agentDir:join(root,'custom-no-enrollment'),roots:[]}),/explicit --source/);
const conflict=join(root,'conflict-agent');await mkdir(conflict);
await writeFile(join(conflict,'mcp.json'),JSON.stringify({mcpServers:{funes_bridge:{command:'/bin/true'}}}));
await assert.rejects(install({...options,agentDir:conflict}),/belongs to another/);
const result={staleBuildRejectedBeforeWrites:true,repeatableInstall:true,repeatableRemoval:true,unrelatedMcpAndBackendPreserved:true,transcriptsAndDerivedMemoryPreserved:true,symlinkAgentWorks:true,externalSourceSymlinkNotEnrolled:true,customRootsRequireEnrollment:true,conflictingOwnershipRejected:true};
await writeFile(join(root,'install-proof.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
