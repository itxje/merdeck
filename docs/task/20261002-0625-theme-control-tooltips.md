# 20261002-0625-theme-control-tooltips Use primary tooltips and simplify the Save label

- **status**: completed
- **priority**: P2
- **owner**: tooltip-save/session-20261002-0625
- **createdAt**: 2026-10-02 06:25

## Description

Use the shared primary theme background and foreground for control tooltips, including their arrows, and remove the shortcut hint from the Save button. Verify both themes and publish v0.19.28 through the established acceptance pipeline.

## ActiveForm

Updating primary tooltip colors and simplifying Save, then verifying delivery.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: the shared tooltip, workspace markup, obsolete header shortcut CSS and existing browser assertions span multiple files. The explicit screenshot request approves this fully specified presentation change; established release authorization covers delivery. Keyboard save handling remains independently implemented and is outside the requested label removal. Inspect painted background/foreground and arrow colors, readable contrast and hover/focus behavior in both themes, desktop and phone geometry, and the exact Save text. Preserve existing functional checks, review the minimal diff and complete frozen installs plus clean local/source/native and public asset acceptance before publishing. Evidence belongs under /home/alan/warehouse/merdeck-tooltip-save/ and /home/alan/warehouse/merdeck-release-v0.19.28/.

## Implementation and focused verification

The shared control tooltip uses primary for its background and arrow background/fill, with primary-foreground text. Save shows only Save or Saving; the separate Ctrl/Meta+S listener and button behavior remain intact. Three obsolete header-only shortcut CSS references are removed.

The existing workspace assertion first failed on Save shortcut text, and the existing browser case first failed on the old tooltip background. All 19 affected workspace/theme cases now pass; frontend lint/types pass with four pre-existing unrelated warnings. Both existing header browser cases pass with zero unexpected browser errors and confirmed service/fixture cleanup. Painted popup background/text and arrow colors match the logo tokens in both themes, with at least 4.5:1 text contrast. Theme hover/focus, preference persistence, explorer controls and 320/360/390px phone layout still pass. The dark screenshot is captured after closing and reopening the popup following the theme change. Light/dark tooltip, Save and 320px header screenshots have been inspected; the minimal implementation review found zero actionable introduced issues.

Evidence: /home/alan/warehouse/merdeck-tooltip-save/ red/green unit/browser logs, confirm-browser.log and review.md; confirmed screenshots are under tmp/e2e-0ZZ8bC/browser-results/. Complete local/source/native verification and v0.19.28 delivery remain pending.

## Complete preparation

Clean implementation 01ff817d0573a8f1867c8884ed8ce90804b528ac passed both local frozen installs, workflow lint, 212 file, 6 storage, 303 backend, 622 frontend and 52 release/CI cases, build and physical directory checks on ARM64/overlayfs with separate tmpfs refusal storage. The complete local gate remains failed: the bundle browser suite passed 108 cases with 17 configuration-dependent skips in 5.8m, but compiled-artifact test:e2e reached its unchanged six-minute budget and exited with SIGTERM. Its descendant browser continued and reported 107 passes, 17 skips and one authentication-loss click timeout after termination. Compiled fixture cleanup is confirmed. The original failed logs and context are preserved as first-local.* under /home/alan/warehouse/merdeck-tooltip-save/; taskist #64 tracks execution cost and browser descendant shutdown. No assertions, time limits, error allowances, application authentication or storage guards were changed. The focused 19 frontend cases, lint/types and both header browser cases pass. Painted popup/arrow colors match the primary theme tokens and text contrast is at least 4.5:1 in both themes; inspected desktop and phone screenshots show the simplified Save label and complete controls. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-tooltip-save/.

[Pre-tag complete normal Linux x64/ext4 verification](https://github.com/itxje/merdeck/actions/runs/36974939893) passed on the same clean candidate, including both artifact suites and native storage acceptance. This supplies complete canonical preparation after the preserved local timeout. Its artifact did not supply publication.

[Exact implementation source verification](https://github.com/itxje/merdeck/actions/runs/36973790098) passed on Linux x64/ext4 with clean commit identity, distinct tmpfs refusal storage and physical source/bundle/compiled directory checks verified in downloaded reports.

## Final acceptance and delivery

The immutable annotated v0.19.28 tag resolves to 01ff817d0573a8f1867c8884ed8ce90804b528ac. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36975673668) passed the complete normal Linux x64/ext4 native gate and same-run publication on attempt 1.

Downloaded reports confirm actual ext4 (0xef53) and distinct tmpfs refusal storage (0x1021994), with matching held-descriptor provenance. All twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters and the complete normal native gate passed with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 3.8m and 4.0m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11212993401 from the same run and commit, with verified artifact digest sha256:18c5fc9d9a17115f5fbe9e3987c096b343b405986f80c5ae4e4cdc0038d796de. No earlier artifact supplied publication.

[v0.19.28](https://github.com/itxje/merdeck/releases/tag/v0.19.28) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.28, tag v0.19.28, commit 01ff817d0573a8f1867c8884ed8ce90804b528ac, bundle target and Bun 1.4.2. Archive SHA-256: bc1148d4bc35a6870621c2e0626e093dc18c429f83d95449d689a30e0292e5b5.

Release notes describe primary control tooltips and the simplified Save label with the documented runtime/platform requirements, retaining the verified publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.28/. The existing release-generator wording follow-up remains taskist #61.

- complete: Published v0.19.28 from 01ff817d0573a8f1867c8884ed8ce90804b528ac after focused checks, complete canonical source/native gates, same-run publication and public artifact verification. Preserved the failed local ARM64 timeout as taskist #64.
