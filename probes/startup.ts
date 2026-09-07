import assert from 'node:assert/strict';
import { readConfig, readReceipts } from '../src/config.ts';
import { Scheduler } from '../src/scheduler.ts';

const root = process.env.PROBE_ROOT;
assert(root, 'Explicit isolated PROBE_ROOT required');
const config = await readConfig(`${root}/agent/funes-bridge.json`);
const receipts = await readReceipts(config.memoryHome);
assert(Object.values(receipts).some(r => r.complete), 'Probe requires a previously committed index');
const phases: string[] = [];
let reachedCurrent!: () => void;
const current = new Promise<void>(resolve => { reachedCurrent = resolve; });
const scheduler = new Scheduler(config, status => {
  phases.push(status.phase);
  assert.notEqual(status.phase, 'never-indexed', 'Previously committed memory must not be reported absent during startup');
  if (status.phase === 'current') reachedCurrent();
});
const timeout = setTimeout(() => { console.error('Startup reconciliation timed out'); process.exit(1); }, 180_000);
try {
  scheduler.start();
  await current;
  await Bun.write(`${root}/startup-proof.json`, JSON.stringify({previousIndexPreserved:true, phases, final:scheduler.snapshot()}, null, 2));
  console.log('EXISTING_INDEX_STARTUP_PASS');
} finally {
  clearTimeout(timeout);
  await scheduler.stop();
}
