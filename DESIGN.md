# OMP–Funes Bridge: Design and Open Questions

Status: research proposal, not an approved implementation specification.
Date: 2026-09-06.
Scope of this project today: this document only. No bridge, dependencies, runtime configuration, or publishing automation has been installed by this project.

## Problem and desired experience

Funes offers durable retrieval over coding-agent transcripts. OMP can discover its tools through native MCP, but tool discovery is only the reading half. Without automatic indexing, completed OMP work never becomes new memory unless the user runs a command.

The target experience is: finish work in OMP, open a fresh session, and retrieve the earlier decisions and evidence without manually exporting, indexing, or writing a handoff. The index must keep updating while the user works, not only when a process exits cleanly.

Research should determine the smallest reliable integration that delivers that loop. Adding another memory engine or reimplementing Funes retrieval is not the goal.

## User constraints and non-goals

- OMP is the host; upstream pi compatibility does not establish OMP compatibility.
- Automatic incremental indexing is essential. A manual CLI recipe is not completion.
- Start with a local memory and OMP's native MCP client. Hub publishing is a separate, optional decision, not required for cross-session recall on one machine.
- The user accepts credentials reaching trusted cloud model providers. Do not make preventing that exposure the project's central problem. Accidental public/team disclosure and ineffective redaction remain distinct risks.
- Preserve original transcripts and existing OMP configuration. Installation and removal should affect only bridge-owned integration entries.
- This research does not authorize indexing real history, binding a remote memory, uploading data, or modifying the user's running OMP installation.
- No custom vector database, model training, retrieval pipeline, dashboard, or multi-platform service framework. Add machinery only if the probes below establish a need.

## Evidence baseline

The following observations come from an earlier isolated compatibility probe in this conversation, not from an implementation in this directory. Its temporary binaries, model cache, configuration, and sample memory were removed. No real session history was indexed or uploaded. Raw probe logs were not retained here; repeat the probes before relying on them for implementation decisions.

| Surface | Observed result | What this does not establish |
| --- | --- | --- |
| Executables | Actual OMP CLI reported `18.1.12`; a checksum-verified Funes Linux binary reported `1.3.0`. `pi` and `funes` were not on PATH before the probe. | Compatibility with later releases or other runtimes. |
| Funes installer | `funes add pi` extracted its extension but could not register it because it invokes `pi`, not `omp`. | An OMP installer can be substituted without other changes. |
| Shipped Pi extension | Loading it in the actual OMP runtime reported `child.stdin.unref is not a function`; no Funes tools registered. | Fixing this one call makes the rest of the extension compatible. |
| Native MCP | OMP discovered `mcp__funes_get`, `recall`, `scan`, `sessions`, `sketch`, and `status` (all with the same prefix). | An actual OMP-issued tool call, automatic tool selection, schema edge cases, or warm-server freshness. |
| Explicit indexing | `funes index <sample-tree> --harness pi --yes` indexed one synthetic OMP-format session into two chunks. | Full fidelity for real OMP sessions, branches, compaction, blobs, or subagents. |
| CLI retrieval | `funes recall` returned the sample's SQLite decision and source-session provenance. | End-to-end recall through OMP; this was a separate CLI invocation. |
| Redaction | Indexing continued with a warning because TruffleHog was unavailable. | That local memory was scanned, or that publishing would bypass its mandatory scan. |

Documented upstream behavior, not independently exercised in that probe:

- Pi automation requests the `pi` harness, whose default session root is `~/.pi/agent/sessions`. OMP's default is `~/.omp/agent/sessions`; profiles and overrides can change it.
- Funes indexing is incremental. An explicit transcript-tree target is supported, and `--harness pi` overrides detection.
- Funes uses a local Lance dataset and local embedding/reranking. Its MCP process can remain alive across calls.
- OMP exposes extension lifecycle events including `session_start`, `turn_end`, and `session_shutdown`.
- Funes requires TruffleHog for publishing and scrub, but local index-time scanning is best-effort. Scrub does not repair original transcripts or already-published remote history.

Public issue/PR/code searches found no dedicated OMP–Funes integration work at the time of investigation. This is a dated negative search result, not a statement about maintainer intent or private work.

## Candidate approaches

| Approach | Advantages | Costs and unresolved risks |
| --- | --- | --- |
| **OMP indexing extension + native MCP** | Reuses OMP's working MCP transport and Funes's existing indexer; lifecycle events identify when new work exists. | Must establish persistence ordering, job ownership, concurrency, catch-up, and live reader freshness. |
| Adapt the complete Funes Pi extension | Reuses upstream onboarding and automation concepts; could become an upstream contribution. | Includes an unnecessary MCP bridge for OMP; already has a runtime failure, `pi` CLI assumptions, and the wrong default session root. Other API mismatches remain untested. |
| External watcher or scheduled indexer + native MCP | Independent of OMP extension APIs; can catch changes from sessions that do not load extensions. | Filesystem writes do not imply completed messages; needs partial-write handling, process/service lifecycle, and deliberate profile scoping. A timer adds freshness delay. |

**Working recommendation:** investigate the indexing-only OMP extension first. Keep the watcher/scheduler as an alternative if lifecycle or subagent coverage is inadequate. Treat upstream contribution as a distribution/maintenance decision after proving behavior, not a prerequisite.

## Proposed data flow and ownership

```text
OMP persists completed session entries
    → bridge requests a refresh for the configured source/memory
    → bounded, coalesced indexing work invokes Funes
    → Funes updates its local memory
    → the existing OMP MCP connection reads the new passages
    → a fresh OMP session can cite the earlier evidence
```

Proposed responsibilities, subject to the research gates below:

- **OMP:** owns transcript persistence, lifecycle events, and MCP transport/tool registration.
- **Bridge:** resolves the intended source and memory, schedules indexing, and exposes stale/error state. It does not parse conversation content or maintain a second index.
- **Funes:** owns parsing, chunk identity, incremental progress, embeddings, storage, and retrieval.

Proposed operating rules:

1. Bootstrap existing history as a separate, bounded operation; do not make every startup wait for the entire archive.
2. Request refreshes after completed work is durably readable. Choose the exact event only after confirming ordering.
3. Coalesce repeated events while indexing runs. Remember that another pass is owed when work arrives during a run; do not drop the final update.
4. Coordinate writers by destination memory, including writers in other OMP processes. First inspect Funes's existing locking; do not add another lock or durable queue speculatively.
5. Catch up after crashes or missed hooks from transcript state at the next startup. Shutdown alone cannot be the durability strategy.
6. Share one explicit memory location between indexing and MCP reading. Resolve profile/session-dir overrides intentionally rather than hardcoding the default root.
7. Indexing errors should leave OMP usable but make stale memory visible. Report operation, source scope, exit status, and last successful refresh without dumping transcript content.
8. Do not report current memory merely because a subprocess exited successfully. Confirm whether it completed the intended coverage and whether the live MCP reader sees it.

The worker mechanism, scope granularity, retry policy, freshness budget, and status surface are not settled APIs. The following questions define how to choose them.

## Open questions and research gates

Use isolated configuration and synthetic transcripts first. Record exact versions and upstream commit IDs when repeating probes. Keep observed results separate from proposed behavior.

### P0 — Does the complete read/write loop work?

| Question | Research probe | Decision evidence |
| --- | --- | --- |
| Can OMP actually call Funes tools, beyond listing them? | Invoke recall and get through OMP's native MCP path against a known sample. Exercise omitted optional parameters and source drill-down. | Correct passages and provenance returned through OMP; no schema/transport errors. |
| Does a warm MCP process see external index updates? | Start MCP, index decision A, retrieve it, append/index decision B, then query again without restarting OMP or MCP. | New content visible; otherwise identify supported refresh/reopen behavior and its cost. |
| Which event occurs after persistence? | Inspect the actual OMP binary version's matching source and instrument real completed turns, tool results, aborts, and compaction boundaries. | Chosen event sees a complete, readable transcript; no timing guess or fixed sleep is required. |
| Can Funes index just the current source cheaply and safely? | Inspect accepted targets; test supported file/directory targeting, partial trailing writes, repeated runs, and appends during indexing. | Stable session identity, no skipped completed records or duplicate growth on unchanged input; measured scan cost. |
| What happens with multiple sessions writing one memory? | Run concurrent indexers and MCP reads; inspect locking, exit codes, and incomplete work after contention. | No corruption or lost final refresh; determine whether bridge-side serialization is necessary. |

Gate: if the warm-reader or persistence contract fails, resolve that before building onboarding or packaging.

### P1 — Coverage, recovery, and usefulness

| Question | Research probe | Decision evidence |
| --- | --- | --- |
| How much of OMP's format does the Pi parser preserve? | Generate OMP-owned fixtures with user/assistant text, tool calls/results, thinking, branches, compaction, title records, custom entries, and externalized content. Compare retrieved evidence to the intended history. | Explicit supported/excluded record matrix. Do not claim lossless import from the two-message sample. |
| Do branches and rewrites invalidate Funes's incremental assumptions? | Index, branch or compact/rewrite the session, then reindex and inspect identities and stale passages. | Defined archive-versus-active-branch semantics; no undetected provenance collision. |
| What source scope follows profiles and custom storage? | Exercise default profile, named profile, `PI_CODING_AGENT_DIR`, `--session-dir`, and separate projects. Inspect Funes harness detection and filters. | Correct root and memory selection without silently crossing trust boundaries. |
| Are subagent sessions covered? | Determine where OMP persists them and whether they load lifecycle extensions. Complete parent/child work and inspect indexing. | Deliberate coverage policy; if children skip hooks, a supported catch-up path discovers them. |
| What survives interruption? | Stop OMP or the indexer mid-run, restart, and append a final turn while a refresh is busy. Repeat lifecycle events. | Automatic catch-up; no indefinitely stale final turn or orphan worker. |
| Does automatic retrieval actually help? | In session A record a decision and rationale not reconstructible from code. Start fresh session B, ask a related question, and observe tool use without a manual recall command. | Correct cited history; distinguish memory availability from whether the model chooses to recall. |
| What freshness and resource cost are acceptable? | Measure cold setup separately from warm per-turn work on small and representative large histories; record event-handler delay, refresh latency, CPU/RAM, and repeated scan/embedding work. | Choose explicit freshness and overhead targets from measurements before implementation acceptance is finalized. |

### P2 — Product and maintenance decisions

- **Memory scope:** one personal memory, per-project memories, or per-profile memories? Compare cross-project utility with contamination and runtime switching cost. Project facets are retrieval filters, not access control.
- **Recursion:** recalled passages enter new transcripts. Does repeated indexing amplify copies, noise, or storage? Measure repeated recall/reindex cycles before introducing exclusion rules that could discard useful evidence.
- **Status and failure UX:** identify an existing OMP extension status surface. Decide what distinguishes never indexed, catching up, current, and failed; avoid a new dashboard.
- **Bootstrap and removal:** establish bounded backfill, repeatable installation, configuration merge behavior, and removal that preserves memories and transcripts. Separate forgetting indexed data from uninstalling automation.
- **Secret scanning policy:** confirm availability and behavior without TruffleHog. Surface the actual state; do not describe unscanned local memory as sanitized. This is not a mandate to block the user's accepted cloud-provider workflow.
- **Optional sharing:** only if requested later, determine explicit session selection, destination verification, and separate publication scheduling. No implicit Hub binding in a local bridge.
- **Distribution:** standalone OMP extension, upstream Funes OMP adapter, or OMP contribution? Recheck public work and contribution policies; assess compatibility ownership and version support before choosing.
- **Existing OMP memory:** check tool-name collisions, prompt guidance, and whether concurrent memory systems duplicate context. Do not disable or replace an existing backend as a side effect.

## Definition of a successful future bridge

These are acceptance scenarios for later implementation, not claims about this document's deliverable:

1. After setup, normal completed OMP turns become searchable without manual indexing; bootstrap and warm-update behavior are separately demonstrated.
2. A fresh OMP session retrieves and cites a decision from another session through native MCP. A long-lived reader also sees newly indexed content without requiring a manual restart.
3. Interruptions, overlapping sessions, repeated events, and work arriving during indexing converge to the intended completed history without corrupting the index.
4. Supported session types and exclusions are documented; profile/source boundaries are exercised. Uncovered subagent or branch history is not silently advertised as remembered.
5. Measured indexing overhead and freshness meet the targets chosen in P1. Errors are visible, OMP remains usable, and retries do not launch unbounded background work.
6. No uploads occur in local mode. Removing integration wiring leaves original history and derived memory intact.

Research is ready to become an implementation plan when P0 is resolved, P1 has a coverage/recovery contract and measured targets, and the remaining product choices are explicit. Until then, keep this a research project rather than declaring MCP discovery a completed integration.

## Sources and reproducibility

Upstream links track moving branches; capture commit IDs for the next investigation. The facts above are bounded to the earlier Funes 1.3.0 / OMP 18.1.12 probe. A separately installed OMP npm package reported 17.3.8, so inspecting that package alone would not establish the actual binary's behavior.

Funes:

- [Pi installer](https://github.com/huggingface/funes/blob/main/src/agents/pi.rs)
- [Pi extension](https://github.com/huggingface/funes/blob/main/integrations/pi/index.ts)
- [Pi transcript parser](https://github.com/huggingface/funes/blob/main/src/traces/pi.rs)
- [Indexing contract](https://github.com/huggingface/funes/blob/main/docs/index.md)
- [Automation](https://github.com/huggingface/funes/blob/main/docs/automation.md)
- [State and environment configuration](https://github.com/huggingface/funes/blob/main/docs/configuration.md)
- [Publishing and scanner behavior](https://github.com/huggingface/funes/blob/main/docs/push.md)
- [Security boundaries](https://github.com/huggingface/funes/blob/main/SECURITY.md)

OMP's bundled documentation, available inside the harness:

- `omp://extensions.md` — registration and lifecycle APIs.
- `omp://session.md` — storage layout, persistence, entries, and externalized content.
- `omp://mcp-config.md` — native MCP configuration and profiles.
- `omp://rpc.md` — isolated host/runtime probing without relying on interactive UI.
- [OMP repository](https://github.com/can1357/oh-my-pi) — resolve source against the executable version before drawing implementation conclusions.
