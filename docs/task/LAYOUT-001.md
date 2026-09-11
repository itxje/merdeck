# LAYOUT-001 Keep file drawer contents within narrow viewports

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-08 03:26

## Description

Correct the demonstrated file drawer grid overflow on narrow screens. Keep descriptions, navigation and controls usable inside the popup, with no horizontal overflow or clipping workaround. Preserve filtering, selection, focus restoration and source/preview behavior.

## ActiveForm

Correcting narrow file drawer layout

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Claimed before investigation under the user's ongoing 2026-09-08 MVP and domain correction authorization. [PLAN-008](../plan/PLAN-008.md) tracks this independent layout correction; earlier editor/save-race completion records remain historical and unchanged. The supplied finding identifies an implicit grid track wider than the 300 px popup at a 390 px viewport. A temporary candidate style is diagnostic evidence only, not built-code acceptance.

### Investigation and proposal

The sourced dialog's implicit auto grid column can exceed the feature's fixed outer width through the tree's min-content sizing. The existing narrow browser helper did not inspect descendants. Inspected the authorized diagnostic measurements/screenshots and the actual CSS, sourced popup, tree and browser helpers. PLAN-008 records the proposed single-rule grid correction and bounds/interaction regression before implementation. Existing 2026-09-08 authorization applies; no design approval or fresh approval timestamp is asserted.

### Baseline reproduction

The unchanged production build passed frontend lint/typecheck/build, then the new real-service browser test failed at the required popup scrollWidth check: 492 px versus clientWidth 300 px (maximum permitted 301 px including rounding tolerance). This own fixture used long nested labels at 390x844. The test recorded actual descendant measurements and a screenshot before asserting. The failed log, exit status, measured bounds and screenshot are retained as local verification evidence. The runner confirmed both service stops and owned root removal. The single grid-track CSS correction was applied only after this failure was captured.

### Focused correction verification

The sole production edit constrains the drawer's grid track to minmax(0, 1fr); no clipping, arbitrary child widths or temporary injected style was added. Frontend lint/typecheck, all 54 unit tests with unchanged coverage thresholds, production build and the focused real-service browser regression passed with exit 0. The browser case passed in 4.2 seconds with zero unexpected page/console/network errors. It checked 390x844 and 360x844, actual main/descendant/search/control bounds, integer scroll widths, visible description wrapping, search filtering, selection, keyboard focus/Escape return, retained drafts, narrow source/preview and desktop interaction. Sample bytes and the owned diagram's original source remained unchanged. Both services stopped and the owned roots were removed.


### Complete executable verification

- The exact command `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check` ran once and exited 0, with status captured before separate cleanup. Runtime: Bun 1.4.2, actual Node 24.20.0, local Chromium headless 153.0.8010.12, actionlint 1.7.12 and strace 6.13. Both frozen lockfiles are unchanged.
- Passed 115 file tests plus domain smoke, 6 storage tests, 1 procfs test, 152 backend tests, 54 frontend tests and 18 release tests, along with lint/typecheck/build and workflow validation. Frontend coverage remains 91.76% statements, 88.19% branches, 89.16% functions and 92.41% lines; thresholds were not changed. Existing renderer chunk-size warnings remain visible.
- All 25 browser cases ran once against the actual executable and passed in 1.3 minutes, with no skips/retries or unexpected browser errors. The new drawer test passed in 5.2 seconds, including real long-label filtering/selection and descendant bounds after filtering. Existing login, source, draft, save, byte-preservation, rendering, theme and responsive cases remain present. All 93 embedded assets matched bytes/MIME/security headers; four lazy diagram families rendered with no outbound resource requests. Both process/file traces proved one executable, empty runtime PATH, no source-checkout access or frontend extraction.
- Implementation/build commit: `2e115ec76e0c61369733161d9116a8cdbd43c190`. The subsequent record-only commit does not change production or test code. Local ARM64 executable SHA-256: `b241fbe1a251fbf7749e335b2150be986ae0706408e4a6d0f225713db1c8c61c`.
- Actual supported fixture storage was canonical overlayfs `0x794c7630`, device 70; the independently identified refusal storage was `0x6a656a63`, device 41. Only disposable sample/child data was used. Service shutdown, runtime/token and child-root cleanup were verified, and the empty owned parent was removed separately. Prior evidence was retained; no live HTTPS service or operator data was accessed or altered.
- Inspected baseline, corrected source-build and final executable screenshots at narrow and desktop sizes. At 390 px the final popup spans x45..345, its grid/content spans x61..329 (268 px), and flow controls end no farther than x319. At 360 px the corresponding bounds are x30..330, x46..314 and x304. Both have clientWidth/scrollWidth 300/300 and two visible description lines. The corner close control remains within the popup; established long-label ellipsis and vertical navigation scrolling remain usable.
- Scoped frontend review found no remaining high-confidence issue in this correction. The single production CSS property changes track sizing without hiding overflow or replacing the sourced primitive. Historical UI/save-race, native and review records remain unchanged; the prototype remains needs-review. Existing native/x64 evidence is historical and does not verify this changed CSS build. Combined-build HTTPS and later checked-candidate acceptance remain downstream.

### Combined verification investigation and proposal

Reclaimed by Frontend maintainer for finite integration verification under the existing 2026-09-08 authorization. The completed drawer and renderer corrections have separate local acceptance; neither run proves their combined executable. Preserve all historical editor, save-race, layout and renderer evidence.

The working tree is clean at `17f22a7be389f0bc047caa0ab5a97e9890fb062d`. The reviewed upstream is exactly `8196c3958e3002e610d61efd29c88516e4ee3998`. Preflight identifies content conflicts only in the changelog and plan/task indexes. Resolve those documents by retaining every existing entry, including both correction rows and accepted domain records. No application or test edits are proposed.

Before verification, prove that the drawer CSS and browser regression retain their original bytes and every other upstream application, renderer, fixture, test, dependency, workflow and design file retains its upstream bytes. Commit the combined implementation cleanly, then run the full frozen-install/check:ci/whitespace chain once with fresh explicitly identified fixtures. Require all 83 frontend tests and 27 executable browser cases, inspect exact-source rendering and narrow drawer evidence, verify embedded assets/trace/cleanup, and record the tested commit. Local ARM64/overlay evidence does not replace subsequent hosted or live HTTPS acceptance.


### Combined implementation verification completed

The finite synchronization produced clean implementation commit `7ecb47d4f91b0b1a157379ac0bcc88fde53c18cb`, with parents `de1ac9b6f26be81dc5cd152bcb0108b65434d345` and `8196c3958e3002e610d61efd29c88516e4ee3998`. Only the three anticipated document conflicts were authored: changelog, plan index and task index. Every existing entry was retained in its source order, including both correction rows and the partial domain status. Original layout delivery `17f22a7be389f0bc047caa0ab5a97e9890fb062d`, renderer delivery `163db777dd919ef1a418646185f838507a966562` and prior editor/save-race history remain ancestors.

Byte comparison verified all 208 other upstream tracked paths unchanged. Relative to the reviewed upstream, application/test differences are exactly the retained one-property drawer CSS correction and drawer browser regression. Both files remain byte-identical to the original layout delivery. No renderer, source fixture, existing test, backend, dependency, lock, workflow, example or prototype was manually changed. No unmerged entries or conflict markers remain.

The prescribed `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check` ran once on that clean combined implementation. Its immediate exit was 0 before independent cleanup. Passed: workflow pins/actionlint; 115 file tests plus domain smoke; 6 storage tests; 1 procfs test; 152 backend tests; all 83 frontend tests across 9 files; 18 release tests; root/frontend lint, strict types, coverage and production builds. Frontend coverage is 91.78% statements, 88.19% branches, 89.16% functions and 92.42% lines; backend coverage is 98.94% functions and 99.47% lines. Thresholds and frozen lockfiles are unchanged. Intentional unsupported-native and compile-failure controls remain explicit; the existing large-chunk advisory remains.

All 27 actual executable browser cases passed in 1.4 minutes, with no skips, retries or unexpected page/console/network errors. The drawer case passed in 4.0 seconds and both renderer cases in 5.3/6.2 seconds. Existing save races, genuine external revision/deletion/auth controls, byte preservation and draft behavior passed unchanged. All 93 embedded resource bodies, hashes, sizes, MIME types and security headers passed; all four lazy diagram families rendered without external requests. Both traces prove exactly one executable, empty runtime PATH, no checkout access and no frontend extraction. Supported/refused trace file-access counts were 22,952/391 with 17/0 scoped writes.

The original 991-byte diagram input retains SHA-256 `0d95ee02341f7fa2e0b80abcf76bc5654ef7662d248c0e6cb30ac1ff73d3aeec`: 16 nodes, 7 branch labels, six intended bare-tag breaks and ordinary additional wrapping. Rendered rows are visibly separated by about 15.4 SVG units. The browser asserted zero implicit writes, one explicit save, exact source/draft/request/disk/reload byte identity, no literal break tokens or active SVG content, and rejection/recovery for hostile neighboring forms.

Inspected the combined executable screenshots of desktop/detail rendering, narrow source/preview and 390/360 px drawers. Popup scrollWidth/clientWidth is 300/300 at both widths; grid width is 268 px. At 390 px, popup/content/control right bounds are 345/329/319 px; at 360 px they are 330/314/304 px. Measured containers/descendants have zero horizontal scroll delta, and the description occupies two visible lines with height/scrollHeight 40/40 px. The initial 390 px capture includes the previous bounded tree cache; the test then waits for the owned long target, rechecks descendant bounds after filtering and selects it. The 360 px capture shows the actual long nested path. Filtering, keyboard focus, Escape restoration, selection, retained draft, narrow tabs and desktop interaction all passed with original sample bytes preserved.

Runtime: Bun 1.4.2, actual Node 24.20.0, Chromium headless 153.0.8010.12, digest-verified actionlint 1.7.12 and local strace 6.13. The matching ARM64 executable is 85,444,904 bytes, embeds the tested commit and Bun runtime, and has SHA-256 `4510f7c47ada659297d8475e7da60341ea88edfd98a3a76c943a626d25aa8e24`. Manifest and complete built asset bytes were independently compared after the gate. Supported fixtures were canonical overlayfs `0x794c7630`, device 70; refusal fixtures were actual host-shared `0x6a656a63`, device 41. Both service stop markers exited 0, loopback URLs became unreachable, private runtime/token/configs and owned child roots were absent, and the empty owned parent was removed separately. Only idle project shells remain.

Scoped preservation/frontend review found no actionable introduced issue. This completion changes only evidence and the layout's own status markers after the tested commit; no aggregate rerun follows documentation. Separate prior layout and renderer evidence remains intact. Local ARM64/overlay verification does not establish new hosted/x64/ext4 or live HTTPS acceptance. The final compare/rename window, local OS-actor limits and historical applicationSafetyPassed=false diagnostic remain unchanged. Prototype status stays needs-review; live deployment and later checked-candidate acceptance remain downstream.
