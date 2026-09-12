# PLAN-022 Admit bidirectional sequence messages and a bounded front matter configuration

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (the owner approved the proposal)
- **relatedTask**: PREVIEW-009

## Context

The preview policy refuses an angle bracket anywhere outside a recognised label break. Flowcharts get the only exception: `maskFlowchart` blanks `<` when it introduces `<--`, `<==` or `<-.`, so `A <--> B` renders. Mermaid gives sequence diagrams the same idea with `<<->>` and `<<-->>`, and those are the only sequence arrows that carry an angle bracket, but no mask covers them, so three of the owner's sequence diagrams are refused for six arrows in total.

PREVIEW-007 admitted a front matter block of exactly one `title` key and refused every other key, because `config` there reaches `addDirective`, the same entry point as the `%%{init}%%` directive the policy refuses. That reasoning still holds for a wholesale `config`. Reading the pinned Mermaid confirms the host is not defenceless — `sanitizeDirective` drops keys outside the schema and `sanitize` drops every key in the host `secure` list at every depth plus string values containing `<`, `>` or `url(data:` — but it also shows one gap that matters here: `themeCSS` is a schema key, is not in the host `secure` list, and is only brace-balanced, while the renderer's measurement host sanitizes with a DOMPurify configuration that does not forbid `style`. Diagram-authored CSS would therefore reach the live document.

The three Gantt charts need only `useMaxWidth`, `barHeight` and `barGap` under a `gantt` section. Every one of those is a boolean or a small integer. A configuration that admits no string value at all covers them and closes the `themeCSS` path by construction rather than by trusting the host list to stay complete.

Revised against the rebased head (NAV-002): the front matter expression is no longer used by validation alone. `fileLinks` and `renderSource` both strip the leading block from the original source with it before they read flowchart statements, and `renderSource` recovers the stripped prefix by length difference. Widening the block therefore has to keep one expression that matches the whole block, so all three callers keep agreeing on where the diagram starts.

## Proposal

1. **Bidirectional sequence messages.** When the source is a sequence diagram, mask the leading `<<` of `<<->>` and `<<-->>` before the disabled-construct check, replacing the pair with two spaces so every other offset is unchanged. This mirrors the flowchart carve-out exactly: the arrow is syntax, not markup, and every other angle bracket in a sequence diagram stays refused, including one in a message body, a participant alias or a note.
2. **Bounded front matter configuration.** Generalise the front matter reader from one `title` line to a leading fenced block whose keys are `title` and `config`, in either order, each at most once. `title` keeps exactly the checks it has today.
3. **What `config` may contain.** Only a two-level shape: a known diagram section, then leaf entries. The section names come from a fixed list. A leaf value may be `true`, `false` or an integer within a bounded range, and nothing else — no string, no list, no third level, and no leaf directly under `config`. This refuses `theme`, `look`, `layout`, `fontFamily`, `themeCSS`, `displayMode` and every other string-valued key without naming them one by one, and it leaves the existing refusal cases passing unchanged.
4. **Mermaid still receives the original source.** As with the title today, the policy validates and then hands the unmodified bytes to the renderer, so an admitted configuration actually applies.
5. **The refusal message and the documented subset** state both additions in the terms the rest of the subset uses.
6. **Documentation.** The README preview subset, the architecture rendering and policy notes, the task and plan records and the changelog.

## Risks

- **The configuration surface is open for the first time.** It is bounded to a fixed section list and to boolean or bounded-integer leaves, so no value can carry text, a URL, CSS or a selector. The `themeCSS` path described in the context is closed by the no-string rule, not by the host `secure` list. If a future Mermaid gives a boolean or an integer key a dangerous meaning, this bound does not catch it; the section list is the place that must then narrow.
- **The reasoning recorded in PREVIEW-007 is being revised, not discarded.** A wholesale `config` stays refused for the reason PREVIEW-007 gave. What changes is that a shape which cannot express any of the feared values is admitted.
- **A wider front matter reader could admit a block the old regex rejected by accident.** The reader must keep every existing refusal: a second block, a block that is not at the start, an unknown key, a repeated key and a bare fence. Those cases already exist as tests and must pass untouched.
- **The sequence mask could widen beyond arrows.** It matches only `<<` immediately followed by `->>` or `-->>`, which is the arrow spelling; a message body containing that exact sequence would also be masked, the same latitude the flowchart carve-out already takes.
- **No claim is made about diagram families other than sequence.** State, ER, class and the rest keep today's refusal of every angle bracket.

## Scope

`web/src/features/preview/source-policy.ts`, its policy tests, a browser case that renders one real bidirectional sequence diagram and one real configured Gantt chart, the README preview subset, the architecture rendering and policy notes, and the changelog. Out of scope: the `secure` list in `renderer.ts`, the measurement-host DOMPurify configuration, `displayMode`, string-valued configuration of any kind, other diagram families, and the owner's diagram files themselves.

## Alternatives

- **Sequence arrows only, and strip `config` from the three Gantt charts instead.** Smallest change and no new configuration surface; the owner loses `barHeight` and `barGap`, and every future configured chart hits the same wall. Declined by the owner, who asked for both in policy.
- **Admit `config` wholesale and rely on the host `secure` list.** Least code, and it accepts anything Mermaid accepts; it also admits `themeCSS` into the measurement host, so it would require changing `renderer.ts` sanitisation as well, which is a larger and riskier change than the one being proposed.
- **Name an explicit allowlist of configuration keys.** Tightest of all, and it accepts the three charts; it needs an edit for every later key, and it does not express the actual safety property, which is that no value may carry text.
- **Add `themeCSS` to the host `secure` list and admit `config` wholesale.** Closes the one known gap but keeps trusting that list to stay complete against future Mermaid schema additions.

## Implementation record

Implemented as proposed. The sequence mask, the widened front matter block, the two-level configuration with no string value, the unchanged original source reaching Mermaid, and the shared expression that keeps `fileLinks` and `renderSource` aligned all landed as written, and the existing front matter refusals needed no edit. Two deviations from the scope as stated are recorded rather than worked around: `bun run check:ci` cannot run in this environment, which pins Node 24.20.0 against an installed 24.21.0, and the browser case was written and typechecked but never executed, because the installed Chromium headless shell cannot start without its system libraries. The evidence, the one pre-existing backend failure and both limitations are recorded in [PREVIEW-009](../task/PREVIEW-009.md).
