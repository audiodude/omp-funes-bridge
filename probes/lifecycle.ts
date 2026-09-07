import { type ExtensionAPI } from '@oh-my-pi/pi-coding-agent';
import { createAssistantMessageEventStream, type AssistantMessage } from '@oh-my-pi/pi-ai';
import { watch } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

export default function probe(pi: ExtensionAPI): void {
  const root = process.env.PROBE_ROOT!;
  const aborted = process.env.PROBE_ABORT === '1';
  const marker = `DURABLE_LIFECYCLE_${aborted ? 'ABORT' : 'COMPLETE'}`;
  const observations: Record<string,unknown>[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release=resolve; });
  let durable!: Promise<void>;
  let stopWatching: (() => void) | undefined;
  let abortedOnce = false;
  pi.registerProvider('funes-probe',{
    baseUrl:'http://127.0.0.1:1',apiKey:'synthetic',api:'funes-probe-api',
    models:[{id:'synthetic',name:'Synthetic lifecycle fixture',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:100000,maxTokens:1000}],
    streamSimple:(model,_,options) => {
      const stream = createAssistantMessageEventStream();
      const message: AssistantMessage = {role:'assistant',content:[{type:'text',text:marker}],api:model.api,provider:model.provider,model:model.id,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:aborted ? 'aborted' : 'stop',timestamp:Date.now()};
      options?.signal?.addEventListener('abort',() => { stream.push({type:'error',reason:'aborted',error:message});stream.end(message); },{once:true});
      queueMicrotask(() => {
        stream.push({type:'start',partial:message});
        stream.push({type:'text_start',contentIndex:0,partial:message});
        stream.push({type:'text_delta',contentIndex:0,delta:marker,partial:message});
        if (!aborted) {stream.push({type:'done',reason:'stop',message});stream.end(message);}
      });
      return stream;
    },
  });
  pi.on('session_start',async (_,ctx) => {
    const file = ctx.sessionManager.getSessionFile()!;
    const dir = file.slice(0,file.lastIndexOf('/'));
    await mkdir(dir,{recursive:true});
    durable = new Promise<void>(resolve => {
      const watcher = watch(dir,async () => {
        if (await Bun.file(file).exists() && (await Bun.file(file).text()).includes(marker)) { watcher.close(); resolve(); }
      });
      stopWatching = () => watcher.close();
    });
    console.error('LIFECYCLE_PROBE_READY');
  });
  pi.on('message_update',(_,ctx) => { if (aborted && !abortedOnce) {abortedOnce=true;ctx.abort();} });
  pi.on('message_end',async (event,ctx) => {
    if (event.message.role !== 'assistant') return;
    const file = Bun.file(ctx.sessionManager.getSessionFile()!);
    const persisted = await file.exists() && (await file.text()).includes(marker);
    observations.push({event:'message_end',persisted});
    assert.equal(persisted,false,'message_end must not be used as a durable barrier');
    await held;
  });
  pi.on('turn_end',async (_,ctx) => {
    const file = Bun.file(ctx.sessionManager.getSessionFile()!);
    const persisted = await file.exists() && (await file.text()).includes(marker);
    observations.push({event:'turn_end',persisted});
    release();
  });
  pi.on('agent_end',async (_,ctx) => {
    await durable;
    stopWatching?.();
    const file = ctx.sessionManager.getSessionFile()!;
    const records = (await Bun.file(file).text()).trim().split('\n').map(line => JSON.parse(line));
    assert(records.some(record => record.message?.content?.some((part:{text?:string}) => part.text === marker)));
    observations.push({event:'filesystem',persisted:true,aborted});
    await Bun.write(`${root}/lifecycle-${aborted ? 'abort' : 'complete'}.json`,JSON.stringify({file,observations},null,2));
    console.error(`LIFECYCLE_${aborted ? 'ABORT' : 'COMPLETE'}_PASS`);
  });
}
