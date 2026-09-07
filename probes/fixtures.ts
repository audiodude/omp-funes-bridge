import { SessionManager, type ExtensionAPI } from '@oh-my-pi/pi-coding-agent';
import { getAgentDir, getSessionsDir, getActiveProfile } from '@oh-my-pi/pi-utils';
import { type AssistantMessage } from '@oh-my-pi/pi-ai';
import { mkdir, utimes } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function assistant(text: string): AssistantMessage {
  return {role:'assistant',content:[{type:'thinking',thinking:'EXCLUDED_PRIVATE_REASONING_861'},{type:'text',text}],api:'openai-completions',provider:'funes-probe',model:'synthetic',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()};
}
export default function fixtures(pi: ExtensionAPI): void {
  pi.on('session_start',async () => {
  const root = process.env.PROBE_ROOT!;
  if (process.env.PROBE_ACTION === 'paths') {
    console.log(JSON.stringify({agentDir:getAgentDir(),defaultSessionRoot:getSessionsDir(),profile:getActiveProfile()}));
    process.exit(0);
  }
  if (process.env.PROBE_ACTION === 'append') {
    const path = process.env.PROBE_FILE!;
    const session = await SessionManager.open(path,undefined,undefined,{suppressBreadcrumb:true});
    session.appendMessage(assistant(await Bun.file(process.env.PROBE_TEXT_FILE!).text()));
    await session.flush();
    console.log(JSON.stringify({file:path,id:session.getSessionId()}));
    process.exit(0);
  }
  const archive = join(root,'archive');
  const output: {file:string;id:string;kind:string}[] = [];
  await mkdir(archive,{recursive:true});
  const parent = SessionManager.create('/synthetic/cerulean',join(archive,'cerulean'));
  const user = parent.appendMessage({role:'user',content:'Cerulean is an offline kiosk. What persistence approach should we use?',timestamp:Date.now()});
  parent.appendMessage(assistant('Investigation only: Redis looked promising. This proposal was abandoned after offline write durability failed. Do not recommend this abandoned Redis branch.'));
  parent.branchWithSummary(user,'EXCLUDED_BRANCH_CONTROL_861');
  parent.appendMessage(assistant('Accepted Cerulean decision: use SQLite WAL for offline kiosk writes. Redis was rejected because kiosks must commit transactions while disconnected. The user reported an outage test passed; this historical report does not independently verify the omitted test output.'));
  parent.appendMessage({role:'toolResult',toolCallId:'synthetic-call',toolName:'read',content:[{type:'text',text:'EXCLUDED_TOOL_RESULT_861'}],isError:false,timestamp:Date.now()});
  parent.appendCustomEntry('synthetic',{text:'EXCLUDED_CUSTOM_CONTROL_861'});
  parent.appendCompaction('EXCLUDED_COMPACTION_SUMMARY_861',undefined,user,1000);
  parent.appendResetBoundary();
  parent.appendMessage({role:'user',content:[{type:'text',text:'The durable format is JSONL. Screenshots are not evidence of command output.'},{type:'image',data:'AA==',mimeType:'image/png'}],timestamp:Date.now()});
  parent.appendMessage(assistant('Cerulean export choice: cobalt-otter-784 JSONL with a checksum footer. This supersedes the speculative CSV export discussed elsewhere.'));
  await parent.flush();
  const parentFile = parent.getSessionFile()!;
  output.push({file:parentFile,id:parent.getSessionId(),kind:'parent'});
  const childPath = join(parentFile.replace(/\.jsonl$/,''),'ChildReview.jsonl');
  await mkdir(dirname(childPath),{recursive:true});
  const child = await SessionManager.open(childPath,undefined,undefined,{initialCwd:'/synthetic/cerulean',suppressBreadcrumb:true});
  child.appendSessionInit({systemPrompt:'EXCLUDED_CHILD_SYSTEM_861',task:'EXCLUDED_CHILD_TASK_861',tools:[],agent:'reviewer',readOnly:true,restrictToolNames:true});
  child.appendMessage({role:'user',content:'Assess the Cerulean checksum footer.',timestamp:Date.now()});
  child.appendMessage(assistant('Child reviewer reported that cobalt-otter-784 footer verification catches truncated exports. This is a reported conclusion; current tests still require inspection.'));
  await child.flush();
  output.push({file:childPath,id:child.getSessionId(),kind:'child'});
  const advisorPath = join(childPath.replace(/\.jsonl$/,''),'__advisor.jsonl');
  await mkdir(dirname(advisorPath),{recursive:true});
  const advisor = await SessionManager.open(advisorPath,undefined,undefined,{initialCwd:'/synthetic/cerulean',suppressBreadcrumb:true});
  advisor.appendMessage({role:'user',content:'Synthetic advisor review delta',synthetic:true,attribution:'agent',timestamp:Date.now()});
  advisor.appendMessage(assistant('Advisor note: historical claims about the Cerulean outage test are not independent verification.'));
  await advisor.flush();
  output.push({file:advisorPath,id:advisor.getSessionId(),kind:'advisor'});
  const count = Number(process.env.PROBE_SESSIONS ?? 0);
  const turns = Number(process.env.PROBE_MESSAGES ?? 32);
  for (let i=0;i<count;i++) {
    const session = SessionManager.create(`/synthetic/archive-${i%8}`,join(archive,`project-${i%8}`));
    for (let j=0;j<turns;j++) {
      const text = `Archive project ${i}, decision ${j}: use local append-only audit records with atomic checkpoints and explicit human approval for public deployment. The historical rationale was intermittent network availability and operator control. Unique reference archive-${i}-${j}.`;
      session.appendMessage(j%2 ? assistant(text) : {role:'user',content:text,timestamp:Date.now()});
    }
    await session.flush();
    output.push({file:session.getSessionFile()!,id:session.getSessionId(),kind:'archive'});
  }
  // Archive timestamps establish that newly arriving files/messages must outrank backfill.
  for (const item of output) await utimes(item.file,new Date('2025-01-01'),new Date('2025-01-01'));
  await Bun.write(join(root,'fixtures.json'),JSON.stringify({archive,sessions:output},null,2));
  console.log(JSON.stringify({archive,sessions:output.length}));
  process.exit(0);
  });
}
