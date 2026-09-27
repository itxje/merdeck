# Proposed fixed-buffer directory primitive

Date: 2026-09-13. Status: reviewed candidate authorized for implementation; production acceptance pending.

## Reviewed candidate decision

Replace the rejected eager directory adapter with the exported glibc `getdents64` function through TypeScript `bun:ffi`, only after review of the experimental production risk and deployment prerequisites. Keep Bun 1.4.2 and Node 24.20.0, require Linux little-endian LP64 x64/arm64, procfs and dynamically loadable glibc >= 2.30. Use one 4096-byte native buffer and the existing two-descriptor ownership budget; preserve all wire schemas, security caps and anchored metadata checks. No package dependency, runtime upgrade or separately deployed/compiled helper is proposed.

The [investigation and correction proposal](../plan/20260913-1657-streaming-directory-correction.md) is authoritative for exact section 1/5 replacement text, ABI/error handling, physical traces, resource accounting, alternatives and acceptance gaps. It distinguishes raw bounded read-ahead from logical `visited` counts; native names and type hints never replace fresh root/ancestor validation or anchored `lstat`.

## Evidence and limits

Actual ARM64/overlay first pages over 1,003 and 100,003 files each issued one 4096-byte-capacity `getdents64`, returning 4080 bytes without EOF. Full traversal returned 100,003 unique names through EOF across 1,001 pages with a reused 4 KiB buffer. Source, bundled and compiled primitive/edge probes ran locally; repeated cleanup and actual two-handle retention passed. Injected EINTR failed without retry; an injected slow syscall delayed main-thread cancellation/shutdown callbacks until return.

The official [FFI documentation](https://bun.com/docs/runtime/ffi) discourages production reliance. Local success does not override that risk, prove hard cancellation, or establish actual x64/ext4/minimum-libc deployment acceptance. Main-thread FFI cannot interrupt a blocked kernel call. The detailed proposal records these gaps and the required separately authorized normal hosted checks.

## Authorization and integration boundary

Existing owner authorization dated 2026-09-13 covers the directory feature after investigation/proposal; the bounded investigation was expressly authorized. Concrete candidate review authorized implementation at 2026-09-13 17:10 UTC; this is not owner-specific FFI production-risk approval or integration/release acceptance. Neither feature completion nor design approval follows from this decision.

The inherited checkpoint `40f20fbc0b44ea7784fdd5540027e7c088e726ff` remains unaccepted, with an introduced full-gate resource failure. The backend task stays `in_progress`, overall feature `implementing`, and prototype `needs-review`. Preserve the failing resource test, existing 0.8.4 behavior and actual overlay/ext4/virtiofs admission/identity. Select this investigation's documentation commit separately; never treat the entire diagnostic branch as green integration.

The reviewed correction is recorded in the implementing correction plan. Actual application source/bundle/compiled physical tests, full local checks and real x64/ext4 normal --native execution remain required; diagnostic toy-probe success is not substituted.

The implemented candidate retains the successful libc bridge for process life and uses a fixed close(i32)->i32 binding with immediate errno capture. Linux close failures never retry a possibly reused fd. Actual application-adapter overlay/virtiofs evidence is recorded in the backend task; experimental FFI, minimum-libc/hardened-host compatibility and actual x64/ext4 acceptance remain material limits.
