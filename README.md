# OMP–Funes Bridge

Automatic local history indexing for [Oh My Pi](https://github.com/can1357/oh-my-pi), with retrieval through [Funes](https://github.com/huggingface/funes) and OMP's native MCP client.

An OMP extension watches persisted session history and schedules bounded background indexing. Native MCP exposes `recall`, `get`, `scan`, `sessions`, `sketch`, and `status`. Bridge-owned guidance asks the assistant to consult relevant history, cite its sources, and distinguish historical reports from current verification.

This is a pinned, machine-targeted integration—not a general compatibility layer. **Supported OMP version: 18.1.14.** Stock Funes is not sufficient; use the patched build below.

## Requirements

- Linux x86-64, OMP **18.1.14**, and Bun **1.4.0**.
- Git, Rust/Cargo, a C/C++ toolchain, `pkg-config`, OpenSSL development headers, `protoc`, and Clang/LLD to build Funes.
- The recorded build used Rust/Cargo 1.98.1 and LLD 18.1.3. Other toolchain/platform combinations are unverified.

Funes is pinned to commit `90507de6bf4a8bedd32aa8acfc0502483d82fbdf` plus [`patches/funes.patch`](patches/funes.patch). The patch adds OMP archive parsing, provenance, bounded indexing, and live-reader behavior required by the bridge.

## Build and install

Run from this repository:

```sh
bun install --frozen-lockfile
bun run build:funes
bun run bridge paths
```

`paths` prints the resolved agent directory and default session root. Review them before installing.

**Installation approves enrollment of the selected history. The next OMP startup automatically backfills existing sessions and indexes future persisted messages under those roots.** The default root is not limited to this project.

```sh
bun run bridge install --funes-bin "$PWD/.build/funes/bin/funes"
```

Restart OMP after installation. On the target host, the defaults are:

| Purpose | Path |
| --- | --- |
| Agent configuration | `~/.omp/agent` |
| Enrolled history | `~/.omp/agent/sessions` |
| Bridge memory home | `~/.omp-funes-bridge` |
| Funes dataset | `~/.omp-funes-bridge/memory` |

OMP's directory resolver accounts for profiles and XDG migration state; use `paths` rather than assuming these defaults apply everywhere.

### Custom profiles or history roots

Custom agent directories and active profiles require explicit `--source` enrollment. Repeat `--source` to enroll multiple roots:

```sh
bun run bridge install \
  --agent-dir /absolute/custom/agent \
  --source /absolute/custom/sessions \
  --source /absolute/another/archive \
  --memory /absolute/personal-funes-home \
  --funes-bin "$PWD/.build/funes/bin/funes" \
  --omp-bin /absolute/omp
```

Each installation has an explicit source list. Descendants of enrolled roots, including child sessions without hooks, are discovered automatically. Source traversal skips symlinks. Project filters are not access-control boundaries.

## Everyday use

Indexing runs while OMP is open: at startup, after lifecycle hints, and on a 10-second reconciliation interval. Closing all OMP sessions stops the automation; reopening catches up from persisted history. The scheduler coalesces work, prioritizes changed/new sources, and retries writer contention without dropping pending work.

- `/funes-status` shows bridge status inside OMP.
- `/funes-retry` requests another reconciliation after a failure without changing enrollment.
- OMP's footer reports coverage and lag. Missing search results do not establish that something never happened when coverage is incomplete.

CLI operations:

```sh
bun run bridge status
bun run bridge run --once
bun run bridge --help
```

`status` reads committed receipts; it is **not** a fresh sweep of source files. `run --once` catches up using the same scheduler and exits nonzero on failure/incomplete coverage. Omit `--once` to keep the scheduler running until interrupted. These commands and `uninstall` accept `--agent-dir` for custom installations.

## What is remembered

The patched parser supports native OMP session versions 2 and 3, including a version-1 title preamble. It indexes persisted user/assistant text and retains native session/entry identities and graph provenance, including archived branches and child/advisor relationships where recorded.

It does **not** index tool calls/results, private thinking, images/binary parts, or control/compaction/custom-message text. Some control IDs and graph edges remain provenance metadata. An indexed statement that tests passed is a historical report, not independent verification; excluded tool output may still exist in the original transcript.

Malformed or partial records, unknown representations, missing dependencies, and persistence truncation remain visibly incomplete. The bridge cannot recover unsaved sessions or bytes OMP already discarded. It does not guarantee that a model will consult memory or interpret citations correctly.

## Privacy and ownership

- Indexing and retrieval use the same explicit local memory. The bridge never invokes publishing, remote binding, or upload commands.
- Dependency installation and first-use inference-model downloads can use the network. Retrieved passages enter the OMP conversation and may be sent to its configured model provider.
- TruffleHog is optional for local indexing. Receipts distinguish scanned, unavailable, failed, and mixed coverage; unscanned memory must not be treated as sanitized.
- Installation owns only `funes-bridge.json`, the `funes_bridge` MCP entry, manifest-tracked files under `extensions/omp-funes-bridge/`, and bridge-owned memory metadata. It preserves unrelated MCP entries and memory backends and refuses conflicting or modified integration files.
- Original transcripts are not rewritten by the bridge.

## Updating

OMP compatibility is deliberately version-locked. A newer OMP release requires reviewing relevant upstream changes, running isolated compatibility probes, and updating the bridge's version pins—not merely bypassing the guard.

After updating bridge source or rebuilding Funes, rerun the installation command with the **same existing enrollment and memory arguments**, then restart affected OMP sessions. The installer checks the Funes executable hash; replacing that binary requires an explicit reinstall. An OMP update alone does not necessarily require rebuilding Funes.

The build defaults to two Cargo jobs. `FUNES_BUILD_DIR` selects a different build directory, `CARGO_TARGET_DIR` selects the Cargo cache, and `CARGO_BUILD_JOBS` changes build concurrency. If the patch changes, use a fresh build directory: the build guard refuses modified or stale cached source instead of overwriting it.

## Removal

```sh
bun run bridge uninstall
```

Restart affected OMP sessions afterward. Removal deletes bridge wiring, **not original history or derived memory**. Forgetting indexed data is a separate operation.

## Verification and design

```sh
bun test
```

The small Bun suite is not the complete compatibility check. Native MCP, persistence, installation, and scheduler probes live in [`probes/`](probes/). **Never run probes against real history, a real agent directory, or existing memory.** See the reproduction instructions in [`SPEC.md`](SPEC.md).

- [`verification/omp-18.1.14.json`](verification/omp-18.1.14.json): current patch-release evidence and explicit limits.
- [`SPEC.md`](SPEC.md): behavior contract, supported representations, operational details, and verification history.
- [`DESIGN.md`](DESIGN.md): original research proposal; not the current installation guide.

The upstream Funes patch's Apache-2.0 license is retained in [`patches/FUNES-LICENSE`](patches/FUNES-LICENSE). Implementation, documentation, and verification work were AI-assisted.
