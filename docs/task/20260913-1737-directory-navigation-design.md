# 20260913-1737-directory-navigation-design Directory navigation prototype and frontend proposal

- **status**: completed
- **priority**: P1
- **owner**: directory-design-20260913-1737
- **createdAt**: 2026-09-13 17:37

## Description

Investigate the directory contract and frontend consumers, propose integration, and build and verify a focused standalone directory navigation variant. Preserve existing design assets and production code.

## ActiveForm

Investigating directory navigation and preparing a focused prototype.

## Dependencies

- **blocked by**: (none)
- **blocks**: production directory navigation integration

## Notes

- The user authorized proposal, implementation, routine design defaults and repairs for this feature on 2026-09-13. This unit covers design and integration planning only. Visual defaults are assumptions, not design approval.
- Clean isolated worktree verified and required local upstream merge completed before investigation.
- Investigation and concrete proposal recorded in [the frontend plan](../plan/20260913-1746-directory-frontend.md) before executable edits. Existing authorization applied. Production integration is a separate pending acceptance stage.
- Focused verification uses Bun 1.4.2 and Node 24.20.0 with unchanged frozen locks. Initial test invocation was corrected to an explicit relative path because root Bun discovery is restricted to src/. Missing-model RED is retained in `tmp/directory-design/red-missing-model.log`; fixture coverage was expanded after the initial below-threshold result (`coverage-initial.log`), without weakening the 80% gate.
- Browser assertion repairs: restricted filtered-row checks to directory rows so retained drafts remain independently accessible. Focus checks now wait for Base UI focus restoration to settle after each Tab, retaining the containment assertion. Initial failures and diagnostics remain in `browser-initial.log` and `focus-initial.log`; screenshots disable transient animations. Existing prototype checks pass 9/9 (`original-check.log`, standalone-export mode).
- Screenshot review found clipped SVG after rapid theme changes with the narrow preview hidden. `geometry-red.log` demonstrates a failed all-node containment assertion. The variant now keeps inactive panes laid out but invisible, preserving bounds without changing production Preview; final focused checks pass the same assertion. This regression is recorded for production integration.
- Final focused results: standalone build embeds one script and one stylesheet (3,949,213 bytes); 4/4 fixture tests, 100% function/line coverage; scoped lint/types; 7/7 real HTTP browser groups at 1440x960 and 390x844, zero console/runtime errors and zero external requests; original HTML hash checks and git diff --check passed. Original prototype: 9/9 groups in standalone-export mode. Logs, screenshots, results and served-byte comparison are under ignored `tmp/directory-design/`; original check details are under `tmp/design/`.
- Verified local URL: http://merdeck-design-ca1f91.localhost:3003/merdeck/Directory-navigation.html . The owned `directory-preview` window uses the documented project/path-hash session name and remains running for review. No public reachability or in-app browser visibility is claimed. Served bytes match the generated file.
- Local implementation review: PASS, no remaining actionable findings. Reviewed fixture state, readonly exact-route server, CSP/resource closure, production component reuse, bounded displayed pages, retained drafts, narrow focus/geometry and asset preservation. No production, release or native acceptance gate was run; those remain pending. The asset remains needs-review.

- complete: Focused design and frontend proposal completed; build, checks, HTTP browser evidence and asset preservation verified. Production acceptance remains pending.
