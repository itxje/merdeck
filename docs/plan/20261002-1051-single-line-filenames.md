# 20261002-1051-single-line-filenames Keep explorer filenames on one line

- **status**: in_progress
- **createdAt**: 2026-10-02 10:51
- **approvedAt**: 2026-10-02 10:51 (explicit single-line request and established release authorization)
- **relatedTask**: 20261002-1051-single-line-filenames

## Context

The stem uses white-space:normal, overflow-wrap:anywhere and a three-line WebKit clamp. The extension is a separate non-shrinking item. File and folder rows already preserve complete path titles, and RowName provides the complete accessible name. Existing browser acceptance requires wrapping and must change with the requested behavior.

## Proposal

Replace stem wrapping/clamping with a block that uses nowrap, hidden overflow and ellipsis. Keep the stem content-sized so short names retain an adjacent extension. Preserve the existing extension item, accessible labels, path titles and row action allocation. Update stale comments and the existing unit-test description. Revise the three existing name-layout browser cases for one-line geometry, equal row heights, horizontal ellipsis, visible adjacent extensions, full names/titles and actual selection. Cover default/minimum/wide desktop rails and narrow phone drawers, with long names and non-Latin text. Run relevant navigation/density/drawer cases, complete frontend checks, implementation review and established source/native release acceptance.

## Risks

Truncated names can share a visible prefix; full accessible names and path titles must remain available. Extensions and row actions must stay contained at minimum width. Short stems must retain content width so extensions do not drift to the far edge. Shared folder/search rows inherit the same one-line rule.

## Scope

Shared filename CSS, directly stale comments/test descriptions, existing browser tests and delivery documentation. No markup, filename transformation, row actions, routing, storage or runtime changes.

## Alternatives

Clipping without ellipsis would hide overflow without an indication. Continuing wrapping would contradict the requested one-line behavior. A custom shortening algorithm is unnecessary when the browser provides standard ellipsis.

## Acceptance

Focused browser red/green; default/minimum/wide desktop and phone screenshots; retained extension, title, accessible name and selection; relevant hierarchy, density and drawer checks; full frontend gates; review; exact source and normal tag native acceptance; verified public artifacts.

## Acceptance-driven correction

The first v0.19.33 native run failed extension/action containment at the supported 180px width with the hosted font, after each artifact suite passed 107 other cases. The unchanged failed tag remains unpublished. Tighten the shared row's fixed gaps so complete extensions and actions fit at that width; preserve icon sizes and row semantics. Add wider-font and dirty-file coverage to the same existing browser case, reproduce locally, and run full acceptance for a new v0.19.34 candidate. This corrects the approved one-line layout's containment requirement without widening product scope or changing verification policy.
