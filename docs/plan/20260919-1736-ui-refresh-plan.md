# 20260919-1736-ui-refresh-plan Plan a UI refresh: type, colour, interaction, mobile

- **status**: completed
- **createdAt**: 2026-09-19 17:36
- **approvedAt**: 2026-09-19
- **relatedTask**: 20260919-1736-ui-refresh-plan

## Context

Measured against the running service at `main` (v0.16.0 build) on a 1440x900 desktop and a 390x844 phone.
The screenshots and the measurement script behind these findings were working material and are not kept in
the repository.

**Type.** `body` computes to 16px, but 95 elements render below 12px and the smallest is 9px
(`.agent-composer > div > span`, the character counter). The explorer list, status bar, pane footers and agent
transcript all sit at 9–11px. The document previews were raised to 17px in v0.16.0, so the reading surface and
the surrounding interface are now two unrelated scales.

**Colour.** Every token in `:root` and `.dark` is `oklch(... 0 0)` — zero chroma. The only chromatic values are
`--destructive` and the diagram palette. Nothing carries brand, selection, focus or progress through colour;
the primary button is near-black and reads the same as a disabled one at a glance.

**Density.** The explorer spends 249px above the first file row (28% of a 900px viewport, measured by
`web/src/test/e2e/explorer-density.spec.ts` rather than estimated) on a heading with three icon buttons, a
two-line breadcrumb, Up/Restart, a search field, a four-way type filter and a sentence of explanation. Below the
list sit three more lines of counters and pagination prose.

**File names.** Rows middle-truncate, so `flow-decisions.mmd`, `flow-decisions_zh.mmd`, `flow-recovery.mmd`,
`flow-recovery_zh.mmd`, `flow-task.mmd` and `flow-task_zh.mmd` all read as `flow-decisio…` / `flow-recove…` /
`flow-task_z…`. Six of eight names in that folder are indistinguishable. Each row also carries an `Unopened`
label that consumes the width the name needs.

**Phone.** The AI panel covers 89.6% of the viewport and sits over the document on every file, because
`merdeck-agent-open` defaults to open and the panel has no phone-specific placement. The empty panel — the
normal state with no provider configured — fills the screen with one sentence. The header truncates the file
name to about five characters while three theme buttons and a display toggle keep full width.

**What already works and must not regress.** The resizable panes, the diagram zoom/pan affordances, the
draft-protection rules, the light/dark/system switch, the new document contents list and the 17px reading
scale. This plan changes presentation and placement, not the file, save or preview contracts.

## Proposal

Five tracks, each independently shippable. Numbers are the proposed targets; the preview shows them applied.

### 1. Type scale

One five-step ramp replaces the ad-hoc 9–13px values:

| Step | Size | Use |
|---|---|---|
| `--text-xs` | 11px | counters, footers, secondary metadata |
| `--text-sm` | 12px | explorer rows, status bar, transcript meta |
| `--text-base` | 13px | controls, buttons, inputs, agent transcript |
| `--text-lg` | 15px | pane titles, header file name |
| `--text-xl` | 17px | document body (already in place) |

Nothing renders below 11px. Path-like strings (breadcrumbs, attached file, tool targets) move to a monospace
stack so a name such as `flow-task_zh.mmd` stays scannable.

### 2. Colour

Keep the neutral canvas; introduce one accent and use it consistently:

- `--primary` becomes a low-chroma teal (`oklch(0.55 0.09 195)` light, `oklch(0.72 0.1 195)` dark), applied to
  the primary button, the selected file row, the focus ring and the live-preview indicator.
- `--destructive` keeps its red for delete and refusal only; a new `--warning` amber carries stale-preview and
  unsaved-draft states, which today share the same grey as inert text.
- Selection becomes a filled accent row rather than the current grey block, so the open file is findable in a
  long list.

### 3. Explorer density

- Fold the heading, breadcrumb and Up/Restart into one 40px row: breadcrumb on the left, the three actions as
  icons on the right.
- Merge the type filter into the search field as a trailing segmented control.
- Drop the explanatory sentence and the `Unopened` per-row label; show unopened state as a dot before the name.
- Collapse the three trailing counter lines into one.
- Result: between 80px and 105px of chrome above the first row (measured at 92px, as delivered) against the
  previous layout's 249px, and six more rows of a sixty-file folder visible at a 900px viewport height, per
  `web/src/test/e2e/explorer-density.spec.ts`.

### 4. File names

Rows wrap instead of middle-truncating, with the extension kept on the first line. A one-line row stays 34px
and a row grows with the lines its name needs, up to three. Long names stay distinguishable, which is the
point of the change.

### 5. Phone layout

- The AI panel becomes a bottom sheet at 55% height with a drag handle, not a full-screen cover, and defaults
  to closed on viewports under 700px regardless of the stored desktop preference.
- With no provider configured the panel collapses to a single dismissible line instead of a full screen.
- The header keeps the brand mark and the file name; theme and display controls move into an overflow menu.
- A three-way bottom bar switches Files / Source / Preview, replacing the current top tab strip.
- Every tap target reaches 44px; the two that do not today are the engine and model selects at 32px.

## Risks

- The accent colour is a visible brand decision; it needs the owner's approval before implementation, which is
  why this plan ships as a preview rather than a patch.
- Wrapping file names changes row height, which the explorer pagination and the drawer's focus handling both
  measure; the browser suite covers both and will need updated expectations.
- The phone bottom sheet replaces the current full-height panel, so the agent e2e case's mobile assertions
  change.
- Raising the smallest type from 9px to 11px makes several bars taller; the header, status bar and composer
  heights all need rechecking at 390x844 and at 700px height.

## Scope

`web/src/index.css` carries most of it. Component changes are limited to `file-tree.tsx` (row layout, filter
placement), `workspace.tsx` (phone panel placement, header overflow), `agent-chat.tsx` (empty state, sheet
affordance). No API, contract or storage change. Estimated five commits, one per track, each with its own
browser-suite update.

## Alternatives

- **Type only.** Fix the 9px floor and leave colour and layout alone: the cheapest change, but it does not make
  the phone usable or the file list readable.
- **Phone only.** Ship track 5 alone: the largest single usability gain, and a reasonable first step if the
  owner wants to defer the visual decisions.
- **Adopt a component library theme.** Rejected: the project already locks shadcn/base-nova, and swapping the
  theme would touch every control for a change the tokens above achieve.

## Annotations

- The owner approved the accent colour and all five tracks on 2026-09-19, in the order above.
- Delivered on 2026-09-20 as five changes, one per track, each with its own task record and browser
  expectations: the type ramp, the accent and warning colour, the explorer density, the wrapping file names
  and the phone layout. The density figures in this plan were estimates; they were replaced with the values
  `web/src/test/e2e/explorer-density.spec.ts` measures.
- The measurement script and the screenshots behind this plan's findings were working material and are not
  kept in the repository.
