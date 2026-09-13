# OMP–Funes Bridge Specification

Status: maintained-fork/source cutover verified in an isolated synthetic sandbox; current evidence is separate from the historical OMP acceptance below.
Date: 2026-09-10; historical implementation verification: 2026-09-07.

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

Preserve archived branches, including abandoned investigations, rather than restricting memory to an active lineage. Retain source provenance and branch/parent-child context where supported. Required historical context must not be silently discarded. Transcript parsing lives in the maintained `audiodude/funes` fork, not the bridge; the consumer checks out a pinned committed revision without applying patches.

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
stdio MCP, not a daemon or a second memory engine. The maintained
[`audiodude/funes`](https://github.com/audiodude/funes) fork owns the OMP parser,
provenance support, and independent local source protocol.
`DESIGN.md` remains the original proposal, not an installation guide.

AI disclosure: the maintained-fork consumer integration and operational
documentation were implemented with OpenAI Codex assistance. Historical
verification records below are not evidence for this new cutover.

### Pinned build

- OMP `18.1.19`, upstream commit `e4dd2ec3b487f216c569281e2cdb7ec476a81f2e`.
- Funes is pinned by the full committed SHA in `src/config.ts` (`FUNES_REVISION`).
  The maintained source is `https://github.com/audiodude/funes.git`; revision
  `e1e398cce025da6c56cb95b18de5e1a7289058e5` is published on the fork's main branch.
  Build it using the commands below or `bun run build:funes`.
  Build and installer require machine capabilities reporting that exact SHA,
  protocol 1, `actomasto-v1` identity, all three harness schemas, and all
  local-only/metadata-only/revision/snapshot guarantees. Stock or stale builds fail.
  The installer records the executable SHA-256; replacement of that executable
  stops indexing until an explicit reinstall.
- Bun `1.4.0`; tested Rust/Cargo `1.98.0`, LLD, Linux x86-64.
  These are the verified versions, not a claim of broad compatibility.

The fork retains Funes' Apache-2.0 license; a copy is retained in `FUNES-LICENSE`.
This is a third-party notice, not a license designation for the entire bridge.
The former consumer patch is committed in the fork and is no longer distributed
or applied by this repository.

From this repository, using the supplied Funes worktree:

```sh
bun install --frozen-lockfile
FUNES_SOURCE=/absolute/funes-worktree
git -C "$FUNES_SOURCE" rev-parse HEAD # must match FUNES_REVISION in src/config.ts
CARGO_BUILD_JOBS=2 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_DEV_OPT_LEVEL=1 \
  CARGO_PROFILE_DEV_INCREMENTAL=false RUSTFLAGS="-C link-arg=-fuse-ld=lld" \
  cargo build --locked --manifest-path "$FUNES_SOURCE/Cargo.toml"
bun run bridge paths
```

Building requires Git, Cargo/Rust, a C/C++ toolchain, `pkg-config`, OpenSSL
development headers, `protoc`, and Clang/LLD. For the published pin,
`bun run build:funes` fetches from the maintained fork. The script checks out the exact
fork revision, rejects a wrong origin/HEAD, tracked changes, and all extra files
(including ignored files), then builds with Cargo's locked dependency graph.
Use a fresh `FUNES_BUILD_DIR` for a new pin; stale or locally modified checkouts
are not reset or overwritten. The resulting binary must pass the same machine
capability check as installation before it is copied to `bin/funes`.
It uses two Cargo jobs by default, optimization level 1, no debug information or
incremental compilation, and the LLD linker. This is the historical measured
profile, not a stock release executable or renewed performance evidence.
`FUNES_BUILD_DIR` changes the default `.build/funes` directory.
`CARGO_TARGET_DIR` defaults to `.build/funes/target` and must remain outside the
source checkout; it can reuse a compatible Cargo target cache.
`CARGO_BUILD_JOBS` overrides build concurrency, not runtime policy.
No system Python packages are needed. Compatibility probing uses a disposable
private empty enrollment and a nonexistent corpus, never installed roots or
environment defaults. It requires no source reads, inventory creation, semantic
index, model download, or provider request, and rejects creation of corpus state.

### Explicit enrollment

**Installing is approval to enroll the selected history. The implementation
verification did not install into the live OMP configuration or index real history.**

```sh
bun run bridge install --funes-bin "$FUNES_SOURCE/target/debug/funes"
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
  --funes-bin /absolute/fork/funes \
  --omp-bin /absolute/omp
```

Repeat `--source` for multiple **OMP** roots. Source lists are explicit per installation;
installations sharing a personal memory should enroll the OMP sources they must keep
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

### Standalone multi-harness source inventory

This is a separate opt-in lifecycle, usable without OMP running and without
semantic indexing. The bridge's `--source`, footer, receipts, and scheduler
remain OMP-specific; they do not enroll Claude/Codex or refresh this inventory.
MCP continues to expose `recall`, `get`, `scan`, `sessions`, `sketch`, and `status`.
The source protocol is a local stdin/stdout command, not a replacement MCP tool.

Choose a private absolute local corpus directory and an independently maintained
scope file, separate from the bridge's semantic memory. Create the scope's parent
directory with mode 0700 and the file with mode 0600; all ancestors must be local,
not symlink escapes. Scope schema (replace paths with your explicitly approved
roots; empty arrays enroll nothing):

```json
{"version":1,"roots":{"claude":["/absolute/claude/projects"],"codex":["/absolute/codex/sessions"],"omp":["/absolute/omp/sessions"]}}
```

Use the pinned fork binary and explicit paths for every request:

```sh
printf '%s\n' '{"protocol":1,"op":"capabilities","corpus":"/absolute/private/source-corpus","scope":"/absolute/private/source-scope.json"}' | /absolute/fork/funes source
printf '%s\n' '{"protocol":1,"op":"refresh","corpus":"/absolute/private/source-corpus","scope":"/absolute/private/source-scope.json"}' | /absolute/fork/funes source
```

`capabilities` is read-only and does not create the corpus or open originals.
`refresh` is the explicit independent indexer action: it fingerprints enrolled
originals and stores a metadata-only immutable inventory. It does not persist raw
turn text, compute embeddings, call a provider, or require searchable chunks.
Consumers such as Actomasto only enumerate/read this inventory; they never refresh
it or manage enrollment. No refresh yet means unavailable coverage, not no history.

For continued discovery, save the **refresh** command above in a private executable
`/absolute/bin/refresh-funes-source` shell script (`#!/bin/sh`, mode 0700). A
standalone user timer can run it even when no OMP session is open. Example units:

```ini
# ~/.config/systemd/user/funes-source-refresh.service
[Unit]
Description=Refresh explicitly enrolled local Funes source inventory
[Service]
Type=oneshot
ExecStart=/absolute/bin/refresh-funes-source
```

```ini
# ~/.config/systemd/user/funes-source-refresh.timer
[Unit]
Description=Periodic local Funes source inventory refresh
[Timer]
OnStartupSec=30s
OnUnitInactiveSec=60s
[Install]
WantedBy=timers.target
```

After deliberate enrollment, `systemctl --user daemon-reload` then
`systemctl --user enable --now funes-source-refresh.timer` activates this separate
lifecycle. Inspect `journalctl --user -u funes-source-refresh.service` for typed
errors and successful snapshot metadata. A user timer requires a running user
manager; this does not silently enable lingering or system services.
Stop/disable the timer separately from uninstalling the bridge. Scope edits change
the inventory identity; consumers must replay expired cursors with durable unit
deduplication. Periodic refresh observes append/rewrite/rotation/disappearance,
including sources too new, malformed, or unsupported for semantic search.

Semantic indexing remains a separate explicit operation and may download local
models. Actomasto consent, budget, revoke, and purge govern its own use, not this
independent inventory or originals. Nothing in these instructions authorizes a
live install, real-history enrollment, remote binding, upload, or provider use.
The full wire contract is in the pinned fork's `docs/local-source.md`.

### Supported archive representation

The maintained fork reads native OMP session versions 2 and 3, including a version-1
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

Initial fork/source evidence is in [`verification/fork-source.json`](verification/fork-source.json). That run used `audiodude/funes@69387f12dca29c2c8e939b0d9890e5768cc2067c`, including upstream main changes rather than reverting them. A fresh checkout built through `bun run build:funes` without patch application; its SHA256 is recorded in the evidence. Three bridge regressions passed, including private metadata permissions under an unrestricted caller umask.

The five-session synthetic workload completed backfill in 5.03 seconds, warm updates in 8.64 seconds, and reopening catch-up in 0.68 seconds. Native MCP retrieved parent/child history and saw a persisted append through the existing reader. These measurements do not renew historical large-load or spontaneous-model-recall claims. Installation/removal remained repeatable, stale builds were rejected before writes, and unrelated configuration and originals were preserved.

Build the current committed Funes worktree as described above, then run `bun test`. For the installation/ownership/scheduler scenario, supply only synthetic inputs and a fresh installation probe root:

```sh
PROBE_ROOT=/absolute/empty/install-probe \
OMP_BIN=/absolute/omp \
FUNES_BIN=/absolute/fork/funes \
PROBE_FIXTURE=/absolute/synthetic/session.jsonl \
bun probes/install.ts
```

This probe also rejects a stale build before installation writes any config or
ownership marker. It runs local semantic indexing; model acquisition may occur.
The current run passed these checks using authored synthetic originals. Retain the historical records below rather than relabeling them as maintained-fork verification.

Historical OMP patch-release compatibility evidence is recorded in
`verification/omp-18.1.15.json`; previous patch-release records remain in
`verification/omp-18.1.14.json` and `verification/omp-18.1.13.json`. The original OMP 18.1.12 measurements and synthetic
citations remain unchanged in `verification/results.json`; reproducible scenario
code is under `probes/`.
Initial probes used the stock release and established native MCP recall and
live-reader behavior before the OMP-specific patch and onboarding implementation.
Subsequent probes used the recorded patched build. Raw thinking/provider payloads
and credentials are not part of the verification record.

### September 2026 dependency refresh

Historical dependency-refresh evidence is in [`verification/dependencies-20260911.json`](verification/dependencies-20260911.json).
That refresh selected `65b91893d2ca7be80a18ed578c392c8260559b8f`, with stable
`hf-hub` 1.0.0 and refreshed compatible Cargo dependencies. OMP and `pi-utils`
remain at the latest published version checked, `18.1.17`; `@types/bun` advances
to `1.4.2`. Actomasto's Python lockfile was already current within its constraints.

The frozen Bun install and three tests passed. Synthetic native probes passed
eight root-resolution cases, completed/aborted persistence, repeatable installation
and removal, stale-build rejection, ownership and source preservation, and native
MCP recall/get with child provenance and live-reader refresh. The five-session
workload reached initial coverage in 14.02 seconds, warm coverage in 11.21 seconds,
and reopening catch-up in 2.32 seconds. Actomasto passed 210 tests against the
rebuilt committed executable and preserved native completed-turn text/provenance,
pending aborted turns, restart deduplication, and interval exclusions.

These checks used synthetic originals and isolated installations, not private
history or the live OMP configuration. No hosted generation, push, publication,
or deployment occurred. Existing unsupported source-format exclusions remain;
large-load, spontaneous-recall, and rendered-TUI claims were not revalidated.

### OMP 18.1.19 compatibility and local rollout

Current evidence is in [`verification/omp-18.1.19.json`](verification/omp-18.1.19.json).
The runtime guard, dependency, and peer pins advance to `18.1.19`. The maintained
Funes pin remains `e1e398cce025da6c56cb95b18de5e1a7289058e5`, which already includes
upstream main `72c108157ffd5721a1cbb68e3394cfa5eeaaac7f`. The OMP fork integrates
the release on `vscode-file-hyperlinks` at
`69775fe62e2fa609837925c92237a266d123b9f2`, preserving the editor-link feature.

OMP's session journal and extension event types did not change in the inspected
release delta. Native MCP name aliases and refresh retention did change; native
recall/get and live-reader refresh were exercised against the compiled fork.
New BTW-history JSON sidecars are separate from the enrolled session journals
and are not newly enrolled by this compatibility update.

Build the OMP executable from the maintained feature branch, not stock upstream,
to retain editor links. This rollout uses integrity-checked published
`@oh-my-pi/pi-natives-linux-x64@18.1.19` baseline/modern addons as compilation
inputs. Reinstallation preserves the existing explicit roots and memory home.
Already-running OMP processes retain loaded code until restarted; do not
terminate unrelated interactive sessions during installation.

Verification passed three bridge regressions, 106 focused OMP regressions,
288 Funes regressions, eight root-resolution cases, completed/aborted session
persistence, installation preservation, existing-index restart, and native MCP
retrieval with live-reader refresh. The rebuilt Funes executable was byte-identical
to the existing verified installation and was reinstalled at the same revisioned
path. When reusing a Cargo target across worktrees, set `FUNES_BUILD_REVISION`
to the verified full Git HEAD to invalidate cached build-script revision metadata;
the capability check still requires the embedded revision to match the bridge pin.

This verification does not renew large-load, spontaneous-recall, rendered-TUI,
or fully current/sanitized historical-coverage claims.

### OMP 18.1.18 compatibility and local rollout

Historical evidence is in [`verification/omp-18.1.18.json`](verification/omp-18.1.18.json).
The runtime guard, dependency, and peer pins advance to `18.1.18`. Funes advances
to published revision `e1e398cce025da6c56cb95b18de5e1a7289058e5` (`1.4.0+dev`),
including GitHub release/update routing; its OMP parser and source protocol are
unchanged. OMP's inspected session-manager delta adds optional `isolated` metadata
to `session_init`; no bridge API adaptation was needed.

Verification passed three bridge regressions, 288 Funes tests, 39 fork hyperlink
tests, the compiled OMP CLI smoke test, completed/aborted RPC persistence,
repeatable installation/removal and ownership checks, existing-index restart,
and native MCP recall/get with child provenance, excluded-content checks, and
live-reader refresh. Native verification used the newly built fork executable
and revisioned Funes executable in a synthetic isolated enrollment.

The local bridge was reinstalled with its existing roots and memory location;
unrelated MCP servers were preserved. A fresh OMP process loaded the new bridge
and resumed indexing without the prior version-mismatch failure. Existing OMP
processes retain their loaded code until restarted. The unrelated Actomasto
consumer retains its own pinned executable and refresh launcher.

This does not establish fully current or sanitized historical coverage, nor
renew large-load, spontaneous-recall, or rendered-TUI claims.

### OMP 18.1.17 compatibility

Historical OMP compatibility evidence is in
[`verification/omp-18.1.17.json`](verification/omp-18.1.17.json).
The exact runtime guard, `pi-utils` dependency, and optional coding-agent peer
are pinned to `18.1.17`; the frozen lockfile check and all three Bun regressions
passed. That run left the maintained Funes fork pin and previously built executable unchanged.

The upstream release changes transport-error recovery, streaming edit guards,
plan autosave, and MCP startup display formatting. SessionManager, extension API
definitions, and directory resolver sources are unchanged. No bridge API or
archive parser adaptation was required.

Fresh isolated probes passed eight directory-resolution cases, repeatable
installation/removal and ownership checks, existing-index startup, completed and
aborted persistence through RPC, and native MCP recall/get with child provenance,
excluded-content checks, and live-reader refresh. The three-session workload
completed initial coverage in 9.41 seconds, arrival-during-import coverage in
3.65 seconds, warm coverage in 11.28 seconds, and reopening catch-up in 2.39 seconds.
The installed extension in OMP made a fresh persisted message searchable through
ranked recall in 9.23 seconds and reached `current` with zero pending sources.

These synthetic host checks do not renew large-load, fault-injection, spontaneous
model recall, or rendered TUI claims. Print-mode lifecycle runs exited before
the asynchronous persistence probe completed; the completed/aborted acceptance
results come from RPC runs. No live installation or real-history enrollment was
changed. Upgrade an existing installation by rerunning the install command with
its existing agent directory, source roots, memory location, and pinned fork
executable, then restart OMP.

### OMP 18.1.16 compatibility

Historical OMP compatibility evidence is in
[`verification/omp-18.1.16.json`](verification/omp-18.1.16.json).
The exact runtime guard, `pi-utils` dependency, and optional coding-agent peer
were pinned to `18.1.16`; `bun install --frozen-lockfile` and all three Bun
regressions passed. Funes retains the maintained-fork revision above, using
the previously built executable recorded in `verification/fork-source.json`.
No Funes rebuild or Cargo dependency update was required for these probes.

The upstream comparison adds rename-request revision tracking to SessionManager
and `isProjectTrusted()` to extension context. Experimental context notes use
custom entries, with rollover represented by compaction metadata. The native
archive message representation, MCP implementation, and directory resolver
sources are unchanged. No bridge API adaptation was required. Experimental
rollover itself was source-reviewed, not exercised end-to-end.

Fresh isolated Linux x86-64 probes passed eight directory-resolution cases,
completed and aborted persistence, native MCP recall/get with child provenance
and live-reader refresh, repeatable installation/removal with ownership checks,
and existing-index startup. The three-session workload completed initial
coverage in 8.74 seconds, arrival-during-import coverage in 3.43 seconds, warm
coverage in 11.19 seconds, and reopening catch-up in 2.29 seconds. The installed
extension running inside OMP made a new persisted message searchable by ranked
recall in 11.35 seconds.

These are synthetic host measurements, not renewed large-load, fault-injection,
spontaneous model recall, or rendered TUI claims. No live installation or
enrollment was changed. To upgrade an existing installation, rerun the install
command with its existing agent directory, source roots, and memory location,
using the pinned fork executable, then restart OMP. Older patch-based Funes
executables do not satisfy the current maintained-fork capability check.

### OMP 18.1.15 compatibility

The upstream comparison changes synchronous session replacement after rename
denial, advisor delivery/budgets, pooled-worker wake handling, and browser
turn-settle behavior. SessionManager, extension API definitions, native MCP,
and directory resolvers have no source changes in the release comparison.
No bridge API adaptation or Funes rebuild was required.

Fresh Linux x86-64 synthetic probes passed all eight directory-resolution cases,
completed and aborted persistence, native MCP recall/get and live-reader refresh,
repeatable installation/removal with unrelated-state preservation, existing-index
startup, and both Bun regressions. The upgraded extension also ran inside OMP
18.1.15 and made a fresh persisted append searchable through ranked recall in
8.83 seconds.

The three-source workload committed 12 chunks in 10.06 seconds. Coverage for an
arrival during import took 3.80 seconds, warm coverage 11.21 seconds, and reopening
2.44 seconds. Indexer peak RSS was 278,516 KiB; scheduler p99 was 0.54 ms.
These host measurements are not directly comparable with earlier VM runs.

The large benchmark, fault matrix (including forced rename denial), spontaneous
model recall, and rendered TUI were not repeated. Synthetic fixtures retain
child/advisor provenance but do not exercise the new live advisor-budget or pooled
worker behavior. Historical verification records remain unchanged.

The existing live installation was refreshed with identical enrollment, memory,
Funes binary, and MCP configuration. Restart existing OMP sessions to load the
updated version guard; live real-history coverage was not measured.

### OMP 18.1.14 compatibility

The 18.1.13 → 18.1.14 comparison leaves SessionManager, lifecycle APIs, directory
resolution, and native MCP implementation unchanged. AgentSession now defers idle
compaction while async wakes are pending; CLI subprocess workers gained parent
liveness checks. The installed CLI reports `omp/18.1.14`. Funes and its recorded
executable hash are unchanged; no rebuild was needed.

Fresh isolated synthetic probes on the Linux x86-64 host passed eight directory
cases, completed and aborted persistence, native MCP recall/get and live-reader
refresh, repeatable installation/removal with unrelated-state preservation,
existing-index startup, and both Bun regressions.

The three-source workload committed 12 chunks in 12.67 seconds. Coverage for an
arrival during import took 5.68 seconds, warm coverage 11.40 seconds, and reopening
2.55 seconds. Indexer peak RSS was 289,288 KiB; scheduler p99 was 0.67 ms.
These host measurements are not directly comparable with the earlier VM runs.
The large benchmark, fault scenarios, spontaneous recall evaluation, and rendered
TUI were not repeated.

The existing live installation was refreshed without changing its enrolled roots,
memory location, Funes binary, or MCP configuration. No additional history roots
were enrolled. Already-running OMP sessions must restart to load the refreshed
extension; this record does not assert live indexing coverage.

### OMP 18.1.13 compatibility

The upstream comparison from 18.1.12 to 18.1.13 changes child-environment handling
and terminal notification routing, but not session persistence, lifecycle APIs,
directory resolution, or native MCP implementation. The installed Linux x64
executable matched the official release asset's SHA-256. The exact patched Funes
executable and patch are unchanged; no Funes rebuild was needed.

Fresh, isolated 18.1.13 runs verified:

- Eight directory-resolution cases against native OMP.
- Completed and aborted assistant persistence: `message_end` and `turn_end`
  precede the durable file record; filesystem observation sees the final record.
- Native MCP recall/get, graph context, text exclusions, and live-reader refresh.
  Explicit MCP memory configuration also won over a conflicting project `.env`;
  the decoy memory directory was never created.
- Repeatable installation/removal and preservation of unrelated configuration,
  transcripts, and derived memory.
- Partial tails, idempotence, writer contention, killed-writer recovery, final
  arrivals, scanner failure, and three recursion cycles.
- Existing-index startup (`checking` → `current`), rendered TUI footer and
  `/funes-status` under an SSH xterm PTY, and the two Bun regressions. Herdr-specific
  terminal integration was not exercised.

The fresh small workload committed 12 chunks from three sources in 4.00 seconds;
warm coverage took 8.61 seconds and reopening took 0.88 seconds. Background-indexer
peak RSS was 293,444 KiB and scheduler p99 was 2.13 ms. The 131-session benchmark
below was not repeated for this patch release.

An initial fault run overlapped other retrieval readers and suffered a
kernel-confirmed OOM kill in the 8 GiB VM. The same scenarios passed in a fresh
fixture without competing readers. The native retrieval memory cost remains
material; this upgrade does not reduce it.

Two fresh Opus 4.6/high sessions spontaneously recalled, cited full provenance,
and distinguished accepted choices from unverified reports. One answer still
overstated that no test output was preserved: excluded index content cannot prove
absence in original transcripts. Both complete answers are retained, including
that limitation; provenance guidance is not a factual-correctness guarantee.
No real history was enrolled and no live OMP configuration was changed.

### OMP 18.1.12 baseline measurements

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

### Reproduction

The retained probes require explicit isolated paths. They create/append synthetic
sessions and, for fault scenarios, interrupt writers or truncate synthetic files.
**Never point probes at real history, a real agent directory, or existing memory.**
They use the native OMP `SessionManager`, not hand-exported transcript substitutes.
Typical reproduction, after building:

```sh
export PROBE_ROOT=/absolute/empty/synthetic-probe
export OMP_BIN=/absolute/omp
export FUNES_BIN=/absolute/fork/funes
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

For lifecycle timing, use an explicit session and keep RPC stdin open. An
extension-defined model must use the qualified selector below, not a separate
`--provider` option:

```sh
export PROBE_ROOT=/absolute/empty/lifecycle-probe
PI_CODING_AGENT_DIR="$PROBE_ROOT/agent" PROBE_ABORT=0 \
  "$OMP_BIN" --model funes-probe/synthetic --mode rpc \
  --session "$PROBE_ROOT/session.jsonl" \
  --no-extensions --no-skills --no-rules --no-title --no-lsp \
  --extension "$PWD/probes/lifecycle.ts"
```

After `LIFECYCLE_PROBE_READY`, send this line on stdin:
`{"type":"prompt","message":"synthetic","id":"lifecycle"}`.
Wait for `LIFECYCLE_COMPLETE_PASS` and the proof JSON before terminating.
Repeat in another empty root with `PROBE_ABORT=1` for `LIFECYCLE_ABORT_PASS`.
A one-shot JSON invocation can exit before the asynchronous proof is written;
absence of a proof in that mode does not establish a persistence regression.

Fixture generation exits inside its startup hook; the synthetic OpenAI value
selects the configured model without making a provider request. Real spontaneous
recall verification is different: use a trusted configured provider, a fresh
session with `--no-session`, an empty project, and a corpus containing only the
original three decision fixtures. Do not enroll generated evaluation answers in
that corpus. The recorded prompts ask about kiosk storage and checksum evidence,
without requesting a memory lookup. Assess full citations, abandoned decisions,
unknown supersession, and the distinction between reports and verification.
Tool selection alone is not the acceptance test.

The original 18.1.12 verification's final two fresh `anthropic/claude-opus-4-6` sessions, with high reasoning,
spontaneously used native recall, cited complete session and entry IDs,
distinguished rejected/superseded choices, treated reviewer claims as reports
rather than independent verification, and disclosed unknown current applicability.
The full answers and earlier failed iterations are retained in the JSON record.
This is representative observed behavior, not guaranteed tool selection or
factual correctness: models can still add unsupported generalizations beyond the
quoted evidence. The bridge supplies provenance and guidance, not a response
validator.

Funes regression commands, in the pinned maintained-fork source checkout:

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
