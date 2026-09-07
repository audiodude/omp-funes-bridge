import { discoverMCPServers, SessionManager, type ExtensionAPI, type ExtensionContext, type CustomToolContext } from '@oh-my-pi/pi-coding-agent';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';

export default function nativeProbe(pi: ExtensionAPI): void {
  async function verify(ctx: ExtensionContext): Promise<void> {
    const root = process.env.PROBE_ROOT!;
    assert(process.env.PI_CODING_AGENT_DIR,'Explicit isolated agent directory required');
    const config = await readConfig(`${process.env.PI_CODING_AGENT_DIR}/funes-bridge.json`);
    assert.equal(config.funesBin,process.env.FUNES_BIN,'Reader and writer must use the same verified build');
    const fixture = await Bun.file(`${root}/fixtures.json`).json();
    const parent = fixture.sessions.find((s:{kind:string}) => s.kind === 'parent');
    const discovered = await discoverMCPServers(ctx.cwd);
    try {
      const tools = discovered.manager.getTools();
      async function call(name:string,args:Record<string,unknown>): Promise<string> {
        const tool = tools.find(t => t.name === `mcp__funes_bridge_${name}`);
        assert(tool,`Missing native tool ${name}`);
        // These probes pass no local:// arguments; MCPTool does not access context-only fields.
        const context = ctx as unknown as CustomToolContext;
        const result = await tool.execute('probe',args,undefined,context);
        assert(!result.isError,JSON.stringify(result));
        const text = result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        assert(!/^(recall|get|status) error:/m.test(text),text);
        return text;
      }
      const recalled = await call('recall',{query:'Cerulean offline kiosk SQLite accepted decision'});
      assert(recalled.includes('SQLite'),recalled);
      const detail = await call('get',{session_id:parent.id});
      assert(detail.includes('supersession unknown'),detail);
      assert(detail.includes('abandoned'),detail);
      assert(!detail.includes('EXCLUDED_'),detail);
      const child = fixture.sessions.find((s:{kind:string}) => s.kind === 'child');
      const childText = await call('get',{session_id:child.id});
      assert(childText.includes(parent.id),childText);
      assert(childText.includes('immediate spawning'),childText);
      const session = await SessionManager.open(parent.file,undefined,undefined,{suppressBreadcrumb:true});
      const marker = `LIVE_READER_${crypto.randomUUID()}`;
      session.appendMessage({role:'user',content:`New Cerulean decision ${marker}: retain the checksum footer for offline export.`,timestamp:Date.now()});
      await session.flush();
      const proc = Bun.spawn([config.funesBin,'index',parent.file,'--harness','omp','--yes','--omp-max-chunks','128'],{env:{...process.env,FUNES_HOME:config.memoryHome},stdout:'pipe',stderr:'pipe'});
      const [stdout,stderr,exit] = await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);
      assert.equal(exit,0,stderr);
      const updated = await call('get',{session_id:parent.id});
      assert(updated.includes(marker),updated);
      const liveRecall = await call('recall',{query:`${marker} Cerulean export checksum`});
      assert(liveRecall.includes(marker),liveRecall);
      await Bun.write(`${root}/native-proof.json`,JSON.stringify({tools:tools.map(t => t.name),recalled,detail,childText,updated,liveRecall,index:stdout},null,2));
      console.error('PATCHED_NATIVE_MCP_LIVE_READER_PASS');
    } finally {await discovered.manager.disconnectAll();}
    process.exit(0);
  }
  // RPC mode keeps stdin open; native calls must not occupy a 30-second lifecycle hook.
  pi.on('session_start',(_,ctx) => {
    console.error('NATIVE_PROBE_READY');
    void verify(ctx).catch(error => { console.error(error); process.exit(1); });
  });
}
