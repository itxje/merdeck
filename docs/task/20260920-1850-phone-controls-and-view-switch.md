# 20260920-1850-phone-controls-and-view-switch Phone controls: the assistant in the header, and the view switch as a row

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-20 18:50

## Description

Two things the owner found on a phone: opening the AI file editor took two taps through the overflow menu,
and the Document/Diagram switch on a Markdown file sat in the corner with its tabs clipped.

## ActiveForm

Promoting the assistant toggle and rebuilding the view switch row.

## Dependencies

- **blocked by**: 20260920-0100-phone-layout
- **blocks**: (none)

## Notes

### The assistant toggle (2026-09-20)

- The phone layout moved the theme switch, log out and the assistant toggle together into the header's
  overflow menu. The first two are settings, reached rarely; the assistant is the thing the panel exists for
  and is opened repeatedly in one sitting, so it does not belong behind a menu.
- It now sits in the header beside the overflow trigger, keeping its accessible name, its pressed state and
  the 44px target. The menu keeps the theme switch and log out.

### The view switch (2026-09-20)

- Measured at 390x844 on a Markdown file: the tab list was 32px tall at y=58 while each trigger, taking the
  phone's 44px touch floor, was 44px tall starting at y=52 — six pixels above its own list and over the
  header, which is the clipping the owner saw. The list also began at x=0, flush against the edge of the
  screen, so the pair read as two stray pills rather than a control.
- The switch is now a row of the reading area: a 6px/14px gutter, a bottom border matching the panes, and a
  list whose height follows its triggers instead of a fixed 32px. Below the phone breakpoint the two tabs
  share the full width as one segmented control.
- After, at the same viewport: the row is 63px tall directly under the header, the list spans x=12 to x=378
  and is 50px tall, and each 44px trigger sits inside it.

### Checks

- A new browser case opens a Markdown file at 390x844 and requires every trigger to sit inside its own list,
  both tabs to share the width, a gutter on each side, and the document to start below the row — against a
  control of the phone header's own height and the row beginning where the header ends.
- The header expectations now require the assistant toggle in the header at 390px and 360px with its target
  size, and require it to be absent from the menu; the four browser cases that opened the panel through the
  menu open it from the header instead.
- `bun run --cwd web lint`, `typecheck`, the web suite, and the full browser suite against a built service.

- complete: one tap opens the assistant, and the view switch reads as one control.
