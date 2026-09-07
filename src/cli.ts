#!/usr/bin/env bun
import { getAgentDir, getSessionsDir } from '@oh-my-pi/pi-utils/dirs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CONFIG_NAME, OMP_VERSION, readConfig, readReceipts } from './config.ts';
import { install, uninstall } from './install.ts';
import { Scheduler } from './scheduler.ts';

const HELP = `OMP–Funes local memory bridge (pinned OMP ${OMP_VERSION})

  bun run bridge paths
  bun run bridge install --funes-bin /absolute/patched/funes [--omp-bin omp]
      [--agent-dir /absolute/agent] [--source /absolute/sessions ...]
      [--memory /absolute/funes-home]
  bun run bridge status [--agent-dir /absolute/agent]
  bun run bridge run [--agent-dir /absolute/agent] [--once]
  bun run bridge uninstall [--agent-dir /absolute/agent]

install is explicit approval to enroll the resolved default root and backfill when
OMP next runs. Custom profiles, agent directories and roots need --source.
Repeat --source to enroll multiple roots in one personal memory. Installation
preserves other MCP entries/backends. run exercises the same bounded scheduler;
--once catches up then exits (nonzero on failure/incomplete coverage).
Uninstall removes only bridge wiring, not sessions or derived memory.
Local indexing downloads inference models when needed; it never publishes.
`;

try {
  const {values, positionals} = parseArgs({args:process.argv.slice(2),allowPositionals:true,options:{
    'agent-dir':{type:'string'},'source':{type:'string',multiple:true},'memory':{type:'string'},'funes-bin':{type:'string'},'omp-bin':{type:'string'},'once':{type:'boolean'},'help':{type:'boolean',short:'h'},
  }});
  const action = positionals[0];
  if (values.help || !action) { console.log(HELP); process.exit(0); }
  const agentDir = values['agent-dir'] ?? getAgentDir();
  if (action === 'paths') console.log(JSON.stringify({agentDir:getAgentDir(),defaultSessionRoot:getSessionsDir()},null,2));
  else if (action === 'install') {
    if (!values['funes-bin']) throw new Error('--funes-bin is required');
    const config = await install({agentDir:values['agent-dir'],roots:values.source ?? [],memoryHome:values.memory,funesBin:values['funes-bin'],ompBin:values['omp-bin'] ?? 'omp'});
    console.log(JSON.stringify({installed:true,agentDir:config.agentDir,roots:config.roots,memoryHome:config.memoryHome,next:'OMP startup automatically reconciles and backfills enrolled history.'},null,2));
  } else if (action === 'uninstall') {
    await uninstall(agentDir);
    console.log('Bridge wiring removed. Original transcripts and derived memory retained.');
  } else if (action === 'status') {
    const config = await readConfig(join(agentDir,CONFIG_NAME));
    const receipts = await readReceipts(config.memoryHome);
    console.log(JSON.stringify({roots:config.roots,memoryHome:config.memoryHome,receipts,note:'These are committed Funes receipts, not a fresh source sweep. OMP footer/run reports current source lag.'},null,2));
  } else if (action === 'run') {
    const config = await readConfig(join(agentDir,CONFIG_NAME));
    let finish!: (code:number) => void;
    const completion = new Promise<number>(resolve => { finish = resolve; });
    let prior = '';
    const scheduler = new Scheduler(config,status => {
      const text = JSON.stringify(status);
      if (text !== prior) { console.log(text); prior=text; }
      if (values.once && status.operation === 'idle' && (status.phase === 'current' || status.phase === 'failed' || (status.phase === 'stale' && status.detail?.startsWith('Source coverage')))) finish(status.phase === 'current' ? 0 : 1);
    });
    const keepalive = setInterval(() => {},60000);
    process.once('SIGINT',() => finish(130));
    process.once('SIGTERM',() => finish(143));
    scheduler.start();
    const exit = await completion;
    clearInterval(keepalive);
    await scheduler.stop();
    process.exitCode = exit;
  } else throw new Error(`Unknown command: ${action}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Bridge operation failed');
  process.exitCode = 1;
}
