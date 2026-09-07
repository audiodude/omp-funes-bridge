import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const root=process.env.PROBE_ROOT!;
assert(root && process.env.OMP_BIN,'Explicit isolated probe paths required');
const home=join(root,'home');
await mkdir(home,{recursive:true});
const xdg=join(root,'xdg');
const cases: {name:string;env:Record<string,string>;create?:string}[] = [
  {name:'default',env:{}},
  {name:'custom-agent',env:{PI_CODING_AGENT_DIR:join(root,'custom')}},
  {name:'named-profile',env:{OMP_PROFILE:'work',PI_CODING_AGENT_DIR:join(root,'ignored')}},
  {name:'empty-canonical-profile',env:{OMP_PROFILE:'',PI_PROFILE:'work'}},
  {name:'xdg-not-migrated',env:{XDG_DATA_HOME:xdg}},
  {name:'xdg-default',env:{XDG_DATA_HOME:xdg},create:join(xdg,'omp')},
  {name:'xdg-profile-not-migrated',env:{OMP_PROFILE:'work',XDG_DATA_HOME:xdg}},
  {name:'xdg-profile',env:{OMP_PROFILE:'work',XDG_DATA_HOME:xdg},create:join(xdg,'omp/profiles/work')},
];
const results=[];
for(const entry of cases) {
  if(entry.create)await mkdir(entry.create,{recursive:true});
  const env={HOME:home,PATH:'/usr/bin:/bin',OPENAI_API_KEY:'synthetic-not-a-key',PROBE_ROOT:root,PROBE_ACTION:'paths',...entry.env};
  const native=Bun.spawn([process.env.OMP_BIN!,'--model','openai/gpt-4o-mini','--no-extensions','--no-skills','--no-rules','--no-title','--no-lsp','--no-tools','-e',resolve(import.meta.dir,'fixtures.ts'),'-p','synthetic'],{cwd:root,env,stdout:'pipe',stderr:'pipe'});
  const [text,error,exit]=await Promise.all([new Response(native.stdout).text(),new Response(native.stderr).text(),native.exited]);
  assert.equal(exit,0,error);
  const actual=JSON.parse(text.trim());
  const cli=Bun.spawn([process.execPath,resolve(import.meta.dir,'../src/cli.ts'),'paths'],{cwd:root,env,stdout:'pipe',stderr:'pipe'});
  const [cliText,cliError,cliExit]=await Promise.all([new Response(cli.stdout).text(),new Response(cli.stderr).text(),cli.exited]);
  assert.equal(cliExit,0,cliError);
  const resolved=JSON.parse(cliText);
  assert.equal(resolved.agentDir,actual.agentDir,entry.name);
  assert.equal(resolved.defaultSessionRoot,actual.defaultSessionRoot,entry.name);
  results.push({case:entry.name,...actual});
}
await Bun.write(join(root,'roots-proof.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
