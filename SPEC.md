# OMP–Funes Bridge Specification

Status: implemented; recorded compatibility and acceptance scenarios passed. Live enrollment remains unapproved.
Date: 2026-09-06; implementation verification: 2026-09-07.

This specification records decisions from the design interview and the subsequently requested implementation. `DESIGN.md` remains unchanged as the original research proposal and evidence baseline; its prior probe results are not renewed verification. Implementation and synthetic verification do not authorize indexing real history, modifying the running OMP installation, remote binding, or uploading data. Live enrollment still requires separate approval.

## Outcome

Normal OMP work becomes durable personal memory without manual export or indexing. A fresh session must retrieve and cite relevant prior decisions without an explicit request to search memory. Indexing and MCP tool discovery alone are insufficient.

Install narrowly scoped, bridge-owned guidance directing OMP to consult Funes when prior decisions are relevant, cite retrieved evidence, and check current code before treating historical statements as current truth. Do not require a lookup on every turn or every session. Verify spontaneous recall in representative scenarios; do not claim guaranteed model tool selection on every turn.

## Scope and enrollment

- Use one local personal memory shared by enrolled sources. Prefer relevant current-project history without preventing useful cross-project recall. Project filters are not access control.
- Eventual setup approval enrolls the default OMP session root and starts bounded backfill of its entire existing history. New projects and sessions under that root are included automatically.
- Custom roots require explicit enrollment. Resolve the actual default root and profile/override behavior through research rather than assuming a hardcoded path. Never silently expand enrollment to additional roots.
- Sharing, Hub binding, publishing, and uploads are outside this specification. No uploads occur in local mode.
- Acceptance targets this machine and recorded, pinned OMP/Funes versions. Repeatable installation and removal are required; public packaging, broad version support, and upstream acceptance are not completion requirements.

## Remembered content and meaning

Index user and assistant message text only. Exclude tool calls/results, private thinking records, and binary payloads. Include persisted child-session messages belonging to enrolled sources, even when children do not load lifecycle extensions. Establish the supported representation of message text and any externalized message content through probes.

Preserve archived branches, including abandoned investigations, rather than restricting memory to an active lineage. Retain source provenance and branch/parent-child context where supported. Required historical context must not be silently discarded: if stock Funes cannot represent it faithfully, narrowly scoped parser/provenance changes in Funes are permitted. Keep transcript parsing out of the bridge. Prefer upstreamable changes, but a recorded patched Funes build is acceptable.

Recall must distinguish historical decisions from current recommendations and disclose when supersession cannot be established. Do not treat speculative, rejected, or superseded statements as current advice merely because they are retrievable.

A citation establishes what a user or assistant reported. It does not independently verify omitted command output, test results, file contents, or tool errors. This limitation also applies to child sessions. Inspect current state when verification matters.

Measure repeated recall/reindex cycles before adding content exclusions for recursion. Do not discard useful message history through speculative deduplication rules.

## Freshness and scheduling

- Target searchable completed messages within three minutes under normal load while OMP is running. The recorded synthetic workloads meet this target; measured conditions and limits are below.
- Prioritize newly completed work over archive backfill so the same target applies during initial import. Backfill must yield between bounded units of work; verified targeting and writer behavior are recorded below.
- Interactive OMP takes priority under contention. Keep lifecycle handlers nonblocking and background concurrency bounded. Slow or pause indexing when it would impair interactive use, exposing the resulting lag.
- Measure cold setup, archive import, and warm updates separately before selecting numerical CPU/RAM limits or finalizing the normal-load benchmark. Do not claim performance acceptance until those conditions are explicit and measured.
- Coalesce refresh requests and retain the obligation to run another pass when changes arrive during indexing. Do not lose the final update.
- Coordinate writes by destination memory across OMP processes. Inspect Funes locking before introducing bridge-side serialization or durable scheduling machinery.
- No work is required after every OMP instance closes. On reopening, automatically catch up from persisted transcript state and expose incomplete coverage until searchable. Shutdown hooks are not the durability mechanism.
- Newly indexed messages must become visible through an already-running native MCP connection without manual restart. Process exit success alone does not establish coverage or reader freshness.

## Status and failure behavior

Use an existing OMP status surface, not a new dashboard. Distinguish never indexed, backfilling/catching up, current, stale, and failed. Report operation, source scope, exit status when applicable, and last successful refresh without exposing transcript content.

Notify once on transition into failure, retain visible failure state, and use bounded automatic retries without repeated alerts. OMP remains usable. Implemented retry timing and status APIs are documented below.

During incomplete backfill, lag, or failure, recall must not imply that missing results prove no prior decision exists. A successful refresh must not conceal unsupported or incomplete source coverage.

Local indexing may continue when TruffleHog is unavailable or scanning fails. Clearly expose the actual unscanned state; never describe it as sanitized. This does not restrict the accepted use of trusted cloud model providers or authorize any publishing.

## Ownership and installation

Preferred architecture: indexing-only OMP extension plus OMP's native MCP client, subject to the research gates below.

- OMP owns transcript persistence and MCP transport/tool registration.
- The bridge owns enrolled source/memory resolution, bounded refresh scheduling, status, and narrowly scoped recall guidance.
- Funes owns parsing, chunk identity, incremental progress, embeddings, storage, and retrieval.

An alternative scheduling mechanism is justified only if probes show the extension cannot satisfy coverage or recovery requirements. Do not add an independent always-running service by default.

Indexing and retrieval must use the same explicit memory location. Preserve original transcripts and existing OMP configuration. Installation must be repeatable and modify only bridge-owned integration entries and guidance. Removal must remove only that wiring, leaving transcripts and derived memory intact. Forgetting indexed data is separate from uninstalling automation. Do not disable or replace existing memory backends as a side effect.

## Research gates

Use isolated configuration and synthetic OMP-owned transcripts for initial probes. Record executable versions, relevant upstream commit IDs, commands, and results. Keep observed behavior separate from proposed behavior.

Before implementation planning is considered ready, establish:

1. Actual recall and source drill-down through OMP native MCP, including omitted optional parameters and live-reader visibility after external index updates.
2. Lifecycle events that observe durably readable completed messages without fixed sleeps, including aborted turns and compaction boundaries.
3. Supported file/directory targeting, unchanged-input idempotence, stable identity, partial trailing writes, and appends during indexing.
4. Concurrent writer/read behavior, contention errors, interrupted writes, and the minimum necessary coordination mechanism.
5. A supported/excluded record matrix enforcing message-only indexing, with archived branch context and persisted child-session provenance. Identify necessary Funes changes rather than silently weakening coverage.
6. Default-root resolution, explicit custom-root enrollment, profile boundaries, and discovery of children that lack hooks.
7. Automatic catch-up after interruption and closure, including a final update arriving during an active refresh.
8. Representative unprompted recall scenarios using bridge-owned guidance, with cited history and no unsupported claim that reported evidence is independently verified.
9. Measured warm-update latency and resource cost on explicit small and representative large workloads, including new work during backfill. Define normal load and quantitative overhead acceptance before declaring the three-minute target met.
10. Recall/reindex recursion behavior, actual scanner state reporting, existing-memory coexistence, and repeatable setup/removal behavior.

Warm-reader and persistence failures block onboarding/packaging work until resolved. Remaining technical facts are not approval to weaken the product contract.

## Acceptance scenarios

1. Approved setup automatically backfills the default-root archive while prioritizing completed new messages. Custom roots remain untouched unless enrolled.
2. Completed user/assistant messages become searchable within three minutes under the defined normal-load benchmark, including during backfill. Interactive work stays usable; contention-related lag is visible.
3. A fresh OMP session spontaneously retrieves and cites a relevant prior decision through native MCP. An already-running reader retrieves newly indexed content without manual restart.
4. Archived branch and persisted child messages retain the supported historical context. Recall does not present known abandoned or superseded decisions as current recommendations; unknown supersession is disclosed. Tool results and thinking are excluded.
5. Interruptions, overlapping OMP sessions, repeated events, and arrivals during indexing converge without index corruption or lost final work. Closing all OMP instances and reopening triggers automatic catch-up.
6. Failure produces a persistent status and one transition notification, with bounded retries and no transcript dump. Incomplete coverage and unscanned memory are not presented as current or sanitized.
7. Repeatable installation preserves unrelated configuration and memory systems. Removal preserves original history and derived memory. Local operation performs no uploads.

## Provenance

The original specification was AI-assisted and prepared from the user's design-interview decisions without new compatibility probes. The subsequent requested implementation and verification are documented below and were also AI-assisted.

## Implementation and operation

The implementation is in `src/`. It uses an indexing-only OMP extension and native
stdio MCP, not a daemon or a second memory engine. `patches/funes.patch` is required:
stock Funes' Pi parser does not satisfy the message-only OMP provenance contract.
`DESIGN.md` remains the original proposal, not an installation guide.

### Pinned build

- OMP `18.1.12`, upstream commit `4f429faef639d182633d1cb3f6a15254adcf25c1`.
- Funes `1.3.0+dev`, upstream commit `90507de6bf4a8bedd32aa8acfc0502483d82fbdf`,
  plus the complete recorded patch. The installer records the executable SHA-256;
  replacement of that executable stops indexing until an explicit reinstall.
- Bun `1.4.0`; tested Rust/Cargo `1.98.1`, LLD `18.1.3`, Linux x86-64.
  These are the verified versions, not a claim of broad compatibility.

From this repository:

```sh
bun install --frozen-lockfile
bun run build:funes
bun run bridge paths
```

Building requires Git, Cargo/Rust, a C/C++ toolchain, `pkg-config`, OpenSSL
development headers, `protoc`, and Clang/LLD. The build script checks out the exact
revision, applies the patch, and rejects cached source with additional changes.
Use a fresh build directory when changing the patch; the guard does not overwrite
stale or locally modified checkouts.
It uses two Cargo jobs by default, optimization level 1, no debug information or
incremental compilation, and the LLD linker. This is the measured build profile,
not a stock release executable. `FUNES_BUILD_DIR` changes the default
`.build/funes` build directory; `CARGO_TARGET_DIR` can reuse a compatible Cargo
target cache. `CARGO_BUILD_JOBS` overrides build concurrency, not runtime policy.
No system Python packages are needed.

### Explicit enrollment

**Installing is approval to enroll the selected history. The implementation
verification did not install into the live OMP configuration or index real history.**

```sh
bun run bridge install --funes-bin "$PWD/.build/funes/bin/funes"
```

Installation itself writes wiring; the next OMP startup starts automatic backfill.
The default memory home is `~/.omp-funes-bridge`, with the actual Funes dataset
under its `memory/` directory. This is deliberately separate from an existing
unowned `~/.funes` memory. Indexing and native MCP receive the same explicit home
and dataset paths.

`paths` uses the pinned OMP directory resolver, including XDG migration state.
On the target host it resolved `~/.omp/agent` and `~/.omp/agent/sessions`.
An unmigrated XDG directory does not silently redirect enrollment. Named profiles,
`PI_CODING_AGENT_DIR`, and `--agent-dir` require explicit `--source` arguments:

```sh
bun run bridge install \
  --agent-dir /absolute/custom/agent \
  --source /absolute/custom/sessions \
  --source /absolute/another/enrolled/archive \
  --memory /absolute/personal-funes-home \
  --funes-bin /absolute/patched/funes \
  --omp-bin /absolute/omp
```

Repeat `--source` for multiple roots. Source lists are explicit per installation;
installations sharing a personal memory should enroll the sources they must keep
fresh. Project facets never act as access-control boundaries. New descendants of
an enrolled root are discovered automatically, including children with no hook.
Canonical roots are pinned; traversal skips symlinks and rechecks the source
boundary immediately before indexing. A missing or replaced root reports failure
rather than silently expanding scope.

The installer owns only `funes-bridge.json`, the `funes_bridge` entry in the
agent's `mcp.json`, and its manifest-tracked files inside
`extensions/omp-funes-bridge/`. Other MCP entries, memory backends, configuration,
and unrelated extension files are preserved. Modified owned files or conflicting
entries are refused rather than overwritten. Re-run installation after changing
the bridge source or rebuilding the Funes executable. Restart the affected OMP
sessions to load updated extension/MCP wiring.

### Scheduling, status, and removal

- Reconcile at startup, after lifecycle hints, and every 10 seconds while OMP is
  running. Events are not persistence barriers; only bytes on disk and committed
  Funes receipts establish coverage. Re-enumerate before reporting completion.
- Select changed/new work ahead of older archive files. Each invocation targets
  one JSONL source, commits at most 128 new chunks, and embeds at most 16 texts per
  batch. The latest messages in a large source are selected first without changing
  chunk identity; later invocations drain older pending chunks.
- Use Funes' destination OS lock. Writer contention exits 75 and retains the
  refresh obligation with a short jittered retry; no bridge lock service or
  durable job database is added. Readers reopen the committed dataset per call.
- Indexers run at nice 19, with Rayon workers set to 1 and Tokio workers to 2.
  These are not a hard total CPU quota: the inference backend has its own workers.
  A load average above 85% of logical CPU count or less than 1 GiB free RAM pauses
  the next unit and reports stale coverage. Shutdown terminates the current child,
  escalating after two seconds; reopening catches up from receipts.
- A failed source retains failed status through five automatic retries, delayed
  5, 15, 30, 60, and 120 seconds after the preceding failure. No further automatic
  attempts occur for unchanged bytes after exhaustion. A source change, restart,
  or `/funes-retry` permits another attempt. Incomplete source formats remain
  visibly incomplete rather than becoming successful merely on exit 0.

The existing OMP footer shows `checking` during initial reconciliation, then
`never-indexed`, `catching-up`, `current`, `stale`, or `failed`, pending sources,
and scanner state. Startup does not claim an existing index is absent.
`/funes-status` shows source scope,
operation, last success, and exit status when available. `/funes-retry` requests
reconciliation without changing enrollment. Notifications occur on transition
into failure, not on each failed retry. Indexer stdout/stderr are not copied into
the OMP transcript or status.

```sh
bun run bridge status
bun run bridge run --once
bun run bridge uninstall
```

All three commands accept `--agent-dir`. `status` displays committed receipts,
explicitly not a fresh source sweep. `run` exercises the same scheduler; without
`--once` it runs until interrupted, and with `--once` it exits nonzero on failure
or unsupported/incomplete coverage. It is diagnostic, not required for routine
indexing. Removal is repeatable and removes only owned wiring. It does not delete
transcripts, derived memory, scanner receipts, or other memory integrations.
Close/restart an already-running OMP session to unload an extension removed from
disk. Forgetting memory is a separate operation, not implemented by uninstall.

### Supported archive representation

The Funes patch reads native OMP session versions 2 and 3, including a version-1
title preamble. It indexes user/assistant string content and typed text parts.
Session/entry IDs remain native identities. It retains the whole persisted graph,
not just the current branch, and keeps graph metadata in Funes-owned provenance
sidecars. Header parents, structural file owners, previous-file references,
compaction/reset/branch controls, synthetic attribution, and retry supersession
metadata remain available for citation where OMP persisted them.
OMP recall passages carry complete, unambiguous UUIDv7 source headings, ready-to-copy
citations, and an explicit historical/not-independently-verified label. Neighbor
passages retain their full text: the stock 160-character preview could clip a
qualifying sentence. Other harnesses' published machine format and parsed `get`
hint lines remain unchanged.

Tool messages, tool calls/results, private or redacted thinking, binary/image
parts, and control/compaction/custom-message text are not searchable content.
Control IDs and edges remain metadata. A dependency outside enrollment can be
inspected for its header/stat provenance; that does not enroll or index its
message text. Structural ownership does not prove which agent issued a task, and
file order does not prove which branch is active.

Partial trailing records, malformed complete records, unknown representations,
missing graph dependencies, and OMP's persistence-truncation marker produce
incomplete receipts while retaining supported complete text. Session version 1
requires an OMP-persisted native migration: the bridge does not invent native
entry IDs or rewrite the original. Unsaved user-only sessions and bytes OMP has
already discarded cannot be recovered. These limitations are visible, not
presented as full coverage.

TruffleHog is optional for local indexing. Receipts distinguish `scanned`,
`unavailable`, `failed`, and `mixed`; a later successful scan cannot retroactively
sanitize previously stored unscanned rows. The bridge never invokes Funes
publishing, binding, or upload commands. First use may download inference models;
local operation is not a promise of network-free dependency/model acquisition.
No claim of guaranteed model tool selection or citation discipline is made.

## Verification record

Machine-specific results and synthetic citations are recorded in
`verification/results.json`; reproducible scenario code is under `probes/`.
Initial probes used the stock release and established native MCP recall and
live-reader behavior before the OMP-specific patch and onboarding implementation.
Subsequent probes used the recorded patched build. Raw thinking/provider payloads
and credentials are not part of the verification record.

The normal-load performance harness uses the local Ubuntu 24.04 VM on this host,
8 vCPUs and approximately 8 GiB RAM, warmed inference-model downloads, no artificial
resource saturation, and synthetic OMP-owned archives. It separately records
first-model setup, empty-memory archive import, new work during import, a warm
append, and catch-up after all schedulers stop. Other isolated native-reader/model
recall probes may overlap; no compiler job overlaps the final archive run.
The representative archive starts with 128 ordinary sessions of 32 messages each
plus a parent/child/advisor graph. Boundary probes separately exercise long
messages, bounded partial passes, and arrivals during a held writer.

Quantitative acceptance is: each measured freshness interval below 180 seconds,
scheduler event-loop p99 below 100 ms, and sampled background-indexer RSS below
1 GiB. The sampler attributes indexers by their scheduler parent PID and separately
records the maximum RSS of any Funes process in the VM.
Scheduler event-loop delay is an overhead measure, not a claim about provider
latency. Actual OMP TUI status/command interaction is checked separately.
An initial sampler conflated native retrieval with background indexing. A separate
default retrieval profile measured a 2,338,044 KiB peak RSS (about 2.23 GiB); this
is a real native Funes reader cost, not an indexer measurement. Account for multiple
MCP readers when opening concurrent OMP sessions. The patch also caps OMP embedding
batches at 16, independently of the 128-chunk commit budget. Cold first-model indexing
was separately measured at 2.09 seconds, 306,940 KiB peak RSS, and 1.21 CPU seconds.
The exact final measurements, source/patch hashes, and command results belong to
the JSON record, not estimates extrapolated to arbitrary archives or system load.

The attributed representative run committed 4,116 message chunks across 131
sessions in 839.18 seconds. Commit-coverage latency was 0.53 seconds for new work
during import, 35.22 seconds for a warm append, and 13.01 seconds after reopening.
Background-indexer peak RSS was 297,428 KiB (about 290 MiB); scheduler p99 was
0.62 ms. Separate ranked-recall probes retrieved unique newly persisted markers
in 14.49 seconds during backfill and 3.57 seconds after reopening, including
native OMP append/startup time. Those probe commands are in `probes/searchable.ts`;
`PROBE_MODE=running` uses an existing scheduler, while `PROBE_MODE=reopen` starts
one after persisting the message. `PROBE_REQUIRE_BACKFILL=1` requires unfinished
archive work at the observed hit. These are CLI recall timing measurements;
the native MCP live-reader contract is exercised separately in `probes/native.ts`.

The small workload committed 18 chunks in 3.45 seconds; warm coverage took 9.43
seconds and reopening took 0.56 seconds. The fixture manifest had three original
sessions; discovery also included one earlier synthetic probe session.

The representative benchmark's recorded executable predates only read-side
evidence labels, full neighbors, and unambiguous UUIDv7 headings. Scheduling and
indexing policy are unchanged; startup status now reports unknown coverage as
`checking` rather than incorrectly claiming no index exists. Benchmark and final
source/executable hashes are retained separately in the JSON record.

The retained probes require explicit isolated paths. They create/append synthetic
sessions and, for fault scenarios, interrupt writers or truncate synthetic files.
**Never point probes at real history, a real agent directory, or existing memory.**
They use the native OMP `SessionManager`, not hand-exported transcript substitutes.
Typical reproduction, after building:

```sh
export PROBE_ROOT=/absolute/empty/synthetic-probe
export OMP_BIN=/absolute/omp
export FUNES_BIN=/absolute/patched/funes
export PI_CODING_AGENT_DIR="$PROBE_ROOT/fixture-agent"
export HF_HOME=/absolute/isolated/model-cache
export OPENAI_API_KEY=synthetic-not-a-key

PROBE_SESSIONS=128 PROBE_MESSAGES=32 \
  "$OMP_BIN" --model openai/gpt-4o-mini --no-session \
  --no-extensions --no-skills --no-rules --no-title --no-lsp --no-tools \
  --extension "$PWD/probes/fixtures.ts" -p synthetic
bun probes/benchmark.ts
bun test
```

After benchmark setup, `bun probes/startup.ts` verifies reopening an existing
index without falsely reporting that it is absent. For the native MCP probe,
keep stdin open (a terminal is sufficient); RPC mode sends no model prompt:

```sh
PI_CODING_AGENT_DIR="$PROBE_ROOT/agent" \
  "$OMP_BIN" --model openai/gpt-4o-mini --mode rpc --no-session \
  --no-extensions --no-skills --no-rules --no-title --no-lsp \
  --extension "$PWD/probes/native.ts"
```

The native probe exits after real recall/get calls and a persisted append becomes
visible through the existing reader. It uses the installed memory configuration,
asserts identical reader/writer builds, and runs outside the 30-second lifecycle
hook deadline.

Fixture generation exits inside its startup hook; the synthetic OpenAI value
selects the configured model without making a provider request. Real spontaneous
recall verification is different: use a trusted configured provider, a fresh
session with `--no-session`, an empty project, and a corpus containing only the
original three decision fixtures. Do not enroll generated evaluation answers in
that corpus. The recorded prompts ask about kiosk storage and checksum evidence,
without requesting a memory lookup. Assess full citations, abandoned decisions,
unknown supersession, and the distinction between reports and verification.
Tool selection alone is not the acceptance test.

The final two fresh `anthropic/claude-opus-4-6` sessions, with high reasoning,
spontaneously used native recall, cited complete session and entry IDs,
distinguished rejected/superseded choices, treated reviewer claims as reports
rather than independent verification, and disclosed unknown current applicability.
The full answers and earlier failed iterations are retained in the JSON record.
This is representative observed behavior, not guaranteed tool selection or
factual correctness: models can still add unsupported generalizations beyond the
quoted evidence. The bridge supplies provenance and guidance, not a response
validator.

Funes regression commands, in the patched source checkout:

```sh
cargo test --locked --lib omp -- --test-threads=1
cargo test --locked --lib commands::index::tests -- --test-threads=1
cargo test --locked --lib ui::render::tests -- --test-threads=1
```

Use the same Cargo profile/linker settings as `scripts/build-funes.ts` to reuse
its artifacts. Small bridge path-boundary regressions run with `bun test`.
The native, lifecycle, roots, fault, installation, and retry scenarios require
their explicit fixture/config environment variables, documented by assertions
at each script's entry point. No probe is part of normal OMP startup.

Implementation and verification were AI-assisted. This operational record extends
the original specification; it does not retroactively turn the original design
document's proposed experiments into observed results.
