# 20260914-1517-mobile-file-drawer Fix the mobile project-files drawer

- **status**: completed
- **createdAt**: 2026-09-14 15:17
- **approvedAt**: 2026-09-14 15:17
- **relatedTask**: 20260914-1517-mobile-file-drawer

## Context

The completed MVP remains out of scope. The supplied phone screenshot shows the Project files dialog as a vertically centred narrow popup with an oversized empty area. In `web/src/index.css`, `.file-drawer .file-tree` has a fixed `64dvh` height. The generic Base UI popup remains centred, so an empty directory still consumes the full file-list height.

`web/src/features/workspace/workspace.tsx` renders the drawer through the existing dialog primitive. `web/src/features/workspace/file-tree.tsx` owns the explorer controls, listing, empty state, and footer. `web/src/test/e2e/drawer.spec.ts` already verifies narrow containment, focus restoration, and ordinary populated content at 360px and 390px, but it does not exercise an empty directory or assert the mobile sheet geometry.

The existing `designs/merdeck/_d_meta.json` has no bound design system and marks the original prototype as needs-review. The existing neutral token palette, Base UI primitives, and 44px narrow-screen targets remain the visual context.

## Proposal

1. Create and register a self-contained interactive mobile drawer prototype under `designs/merdeck/`. It will show empty and populated states, use the existing neutral visual language, and remain `needs-review`.
2. Add a small semantic state to the file tree only if it is needed to let an empty drawer collapse to its content while keeping populated listings scrollable.
3. Add mobile-only CSS for an edge-aligned bottom sheet with safe-area padding, a bounded scrolling listing, and a content-sized empty state. Leave the shared dialog primitive and desktop styles untouched.
4. Extend the existing browser drawer regression with an empty-folder case at 360px and 390px. Establish the failing layout assertion first, then verify containment, bottom alignment, compact empty geometry, focus restoration, and no horizontal overflow.
5. Run the focused browser and frontend checks, the repository quality gate, and a local TypeScript frontend review before recording completion.

## Risks

- An override that accidentally affects the generic dialog could regress logout or conflict-review dialogs. The CSS will stay scoped to `.file-drawer` inside the existing narrow breakpoint.
- Reducing the height without a bounded scroll region could hide long directory listings. The populated-state browser case must retain reachable scrolling controls.
- Bottom alignment must preserve Base UI focus trapping and Escape/focus restoration; the existing regression will be extended rather than replaced.
- iOS safe-area behavior varies with browser chrome. The mobile sheet will use dynamic viewport units and `env(safe-area-inset-bottom)` while the automated regression checks viewport containment.

## Scope

Expected changed files:

- `docs/task/20260914-1517-mobile-file-drawer.md`
- `docs/task/index.md`
- `docs/plan/20260914-1517-mobile-file-drawer.md`
- `docs/plan/index.md`
- `docs/changelog.md`
- `designs/merdeck/Mobile-file-drawer.html`
- `designs/merdeck/_d_meta.json`
- `designs/merdeck/README.md`
- `designs/merdeck/check.ts`
- `designs/merdeck/mobile-drawer-check.ts`
- `designs/merdeck/serve.ts`
- `web/src/features/workspace/file-tree.tsx`
- `web/src/index.css`
- `web/src/test/e2e/drawer.spec.ts`

Out of scope: backend modules, file access rules, API contracts, dependencies, generic UI primitives, authentication, release packaging, and completed MVP records.

## Alternatives

- Reduce the existing fixed height only: rejected because it retains the vertically centred popup and still reserves blank space for empty folders.
- Change the shared dialog primitive: rejected because it expands scope to logout and review dialogs without evidence of a defect there.
- Replace the drawer with a new component library: rejected because existing Base UI and shadcn primitives meet the need and no dependency change is justified.

## Annotations

- 2026-09-14 15:17 — The owner authorized direct repair. The earlier MVP authorization does not apply to this new repair.
- 2026-09-14 15:17 — Visual defaults are implementation assumptions: use the existing neutral palette, preserve the desktop dialog, use a mobile-only bottom sheet, retain 44px targets, and keep the new prototype `needs-review` until the owner reviews it.

## Implementation record

- The Project files dialog is now a bottom-aligned mobile sheet with dynamic viewport sizing, safe-area padding, and a scoped compact state for an empty settled folder. Populated listings retain a bounded, scrollable tree. Desktop explorer and generic dialogs are unchanged.
- A self-contained `Mobile-file-drawer.html` prototype and HTTP browser check document the assumed visual direction. The registered prototype remains `needs-review`.
- The regression first failed against the fixed empty-list height, then passed at 360 px and 390 px with compact geometry, sheet alignment, overflow containment, Escape/focus restoration, and populated-list scrolling.

## Verification record

- Focused build and drawer browser checks, frontend lint/typecheck/coverage (473 tests), design checks, and whitespace validation passed.
- The normal authoring-tree aggregate completed application and browser stages but its evidence exporter correctly rejected dirty provenance. Clean-candidate aggregate runs then exposed a pre-existing order-dependent desktop source-pane visibility failure; direct repetitions of the affected cases pass. This repair does not claim a passing aggregate or native x64/ext4 delivery. The follow-up is [20260914-1559-source-pane-e2e-ordering](../task/20260914-1559-source-pane-e2e-ordering.md).
- Incremental core/TypeScript frontend review found no high-confidence introduced finding.
