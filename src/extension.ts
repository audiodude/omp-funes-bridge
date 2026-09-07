import { getAgentDir, VERSION, type ExtensionAPI, type ExtensionContext } from '@oh-my-pi/pi-coding-agent';
import { join } from 'node:path';
import { realpath } from 'node:fs/promises';
import { CONFIG_NAME, OMP_VERSION, OWNER, inside, readConfig, type Config, type Status } from './config.ts';
import { Scheduler } from './scheduler.ts';

export const RECALL_GUIDANCE = `Personal historical memory is available through OMP's native funes_bridge MCP server. Consult it without an explicit search request when prior decisions, rejected approaches, preferences, or investigations materially affect the answer. No lookup is required every turn. Prefer current-project terms; cross-project recall remains allowed, and project filters are not access control. Read tool schemas. Use recall, and get/scan when fuller source context is needed.

For an answer based on memory, separate:
1. Recorded evidence: quote the relevant messages and copy their COMPLETE [session UUID, seq N, turn entry-ID] citations. Never abbreviate UUIDs. Attribute parent, child, advisor, and branch statements to their own sources.
2. Assessment: distinguish explicit accepted, speculative, rejected, and superseded statements. Do not invent project rationale or turn unrelated neighboring hits into extra recommendations. Parent links and file order do not establish an active branch.
3. Limits: unless current code/state and explicit later decisions were checked, say "Current applicability and supersession are unverified." An archived accepted decision does not establish that its implementation works or remains current.

Historical test or behavior claims are REPORTS, not verification. Say "A reviewer reported it works; this remains unverified", NOT "A reviewer confirmed/verified it works". Speaker attribution alone does not confer verification.
Tool results and private thinking are intentionally excluded from this INDEX. They may still exist in the original transcript. Never infer that tests did not run or that output was not captured, recorded, or preserved merely because memory cannot show it.
During backfill, lag, unsupported coverage, or failure, missing hits do not establish absence. Check bridge coverage and Funes status when results are thin. Local memory may be unscanned or partly scanned; never call it sanitized. No uploads, publishing, or remote binding are authorized. Other configured memory systems remain available.

Before finishing: full source citations; quoted evidence separate from inference; reports not verified outcomes; unknown current applicability/supersession stated; index exclusions not confused with missing original evidence.`;

export default function bridge(pi: ExtensionAPI): void {
  let scheduler: Scheduler | undefined;
  let config: Config | undefined;
  let context: ExtensionContext | undefined;
  let state: Status | undefined;
  let failureNotified = false;
  let configurationError = false;

  function render(status: Status): void {
    state = status;
    if (!context) return;
    const currentFile = context.sessionManager.getSessionFile();
    const outside = currentFile && config && !config.roots.some(root => inside(currentFile, root));
    const scan = status.scanner === 'scanned' ? 'scanned' : `unscanned:${status.scanner}`;
    const suffix = outside ? ' · current source not enrolled' : '';
    context.ui.setStatus(OWNER, `Funes ${status.phase} · ${status.pending} pending · ${scan}${suffix}`);
    if (status.phase === 'failed') {
      if (!failureNotified) context.ui.notify('Funes refresh failed; memory coverage is incomplete. /funes-status shows scope and retry state.', 'warning');
      failureNotified = true;
    } else failureNotified = false;
  }

  pi.on('session_start', async (_, ctx) => {
    context = ctx;
    if (scheduler) { scheduler.request(ctx.sessionManager.getSessionFile()); return; }
    try {
      if (VERSION !== OMP_VERSION) throw new Error('Unsupported OMP version');
      config = await readConfig(join(getAgentDir(), CONFIG_NAME));
      if (config.agentDir !== await realpath(getAgentDir())) throw new Error('Profile configuration does not match installation');
      scheduler = new Scheduler(config, render);
      configurationError = false;
      scheduler.start();
    } catch {
      configurationError = true;
      ctx.ui.setStatus(OWNER, 'Funes failed · configuration/version mismatch · coverage unknown');
      if (!failureNotified) ctx.ui.notify('Funes bridge configuration or pinned OMP version is invalid. No indexing started.', 'warning');
      failureNotified = true;
    }
  });
  const dirty = (_: unknown, ctx: ExtensionContext) => {
    context = ctx;
    scheduler?.request(ctx.sessionManager.getSessionFile());
  };
  // These events are invalidation hints, NOT persistence certificates. The scheduler only
  // acknowledges Funes receipts for bytes observed on disk; reconciliation covers missing hooks.
  pi.on('message_end', dirty);
  pi.on('agent_end', dirty);
  pi.on('session_compact', dirty);
  pi.on('session_switch', dirty);
  pi.on('session_shutdown', async () => { await scheduler?.stop(); });
  pi.on('before_agent_start', (event, ctx) => {
    context = ctx;
    const coverage = configurationError ? 'failed: configuration/version mismatch; coverage unknown' : state ? JSON.stringify(state) : 'startup reconciliation incomplete; index existence and coverage unknown';
    return {systemPrompt:[...event.systemPrompt, `Funes bridge coverage: ${coverage}\nCurrent project: ${ctx.cwd}`, RECALL_GUIDANCE]};
  });
  pi.registerCommand('funes-status', {
    description:'Show Funes source coverage, last refresh, and actual scanner state',
    handler:async (_, ctx) => { ctx.ui.notify(state ? JSON.stringify(state, null, 2) : 'Funes startup incomplete; index existence and coverage unknown.', 'info'); },
  });
  pi.registerCommand('funes-retry', {
    description:'Retry failed Funes refreshes without changing enrollment',
    handler:async (_, ctx) => { scheduler?.retry(); ctx.ui.notify(scheduler ? 'Funes reconciliation requested.' : 'Funes bridge not configured; reinstall the pinned integration.', scheduler ? 'info' : 'warning'); },
  });
}
