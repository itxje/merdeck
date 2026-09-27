# 20260913-1657-streaming-directory-investigation Investigate bounded directory primitives

- **status**: completed
- **priority**: P1
- **owner**: directory-maintainer/20260913-1657
- **createdAt**: 2026-09-13 16:57

## Description

Investigate a physically bounded TypeScript directory primitive under the pinned runtime. Produce a reviewed correction proposal and evidence; no executable feature adoption.

## ActiveForm

Investigating fixed-buffer directory enumeration

## Dependencies

- **blocked by**: 20260913-1637-directory-backend (incomplete checkpoint available for diagnosis)
- **blocks**: directory primitive correction review

## Notes

- Full tier. Owner authorization on 2026-09-13 covers the existing directory feature; the current bounded diagnostic work is expressly authorized. Experimental FFI adoption requires separate concrete review before feature changes.
- Clean starting branch synchronized with local coordination baseline a74391983abdcb64c7f8a4d8d52988e59a2c61b6, then exact incomplete checkpoint 40f20fbc0b44ea7784fdd5540027e7c088e726ff. Both merges fast-forwarded. The inherited executable changes are unaccepted and the introduced full-gate resource regression remains unresolved.
- Only ignored tmp probes and task/plan/decision/changelog documentation may change. Backend task remains in_progress; feature remains implementing; prototype remains needs-review.

### Investigation result

- Completed the [correction proposal](../plan/20260913-1657-streaming-directory-correction.md) and [proposed primitive decision](../decisions/20260913-1705-bounded-directory-primitive.md). The primitive is viable locally; experimental FFI adoption and feature acceptance remain pending concrete review.
- Actual ARM64/Bun 1.4.2/glibc 2.41 on overlay: first pages for 1,003 and 100,003 files each used one 4096-byte-capacity getdents64 call, returning 4080 bytes without EOF. All 100,003 names traversed in 1,001 pages, 783 calls including EOF, no duplicates, one reused 4 KiB buffer.
- Source, bundle and compiled primitive/edge probes passed. Real procfs identity/admission, two-handle ownership, 32 cleanup cycles, invalid UTF-8/record bounds, EINTR without retry, and delayed synchronous-call cancellation/close behavior are recorded. A cold stderr descriptor-count failure and mistargeted initial fault injection were investigated and preserved, not counted as passes.
- No actual x64/ext4/minimum-libc or full application quota/cancellation/native acceptance was run. The original introduced resource regression and full-gate exit 1 remain unchanged. Proposal sections provide exact corrections for original plan sections 1/5 without changing its implementing status.
- PMA core/backend self-review of the docs-only delta: PASS with zero actionable findings. Probe runner exits 0, documentation link/status/provenance checks and git diff --check pass. This is not feature check:ci acceptance.

- complete: Diagnostic report and correction proposal complete; primitive evidence passed locally, production adoption and feature acceptance remain pending.
