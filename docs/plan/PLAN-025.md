# PLAN-025 Refuse only the preview security boundary and admit the remaining Mermaid syntax

- **status**: completed
- **createdAt**: 2026-09-12
- **approvedAt**: 2026-09-12 (the owner approved the proposal and asked for the preview size limits to change as well)
- **relatedTask**: PREVIEW-011

## Context

The preview policy refuses broad character classes and words across the whole source — any `<`, any `&`, any backslash, any address, and the words `click`, `href`, `link`, `links`, `style`, `classDef`, `linkStyle` and `css` — and then masks exceptions family by family. Each release has added another mask for another family. The owner measured the result: of 107 common constructs, 67 are valid Mermaid the policy refuses, and most of them are ordinary syntax (class relations, `<<interface>>`, state `<<choice>>`, `&` in a message, the word `CSS` in a label, a backslash in a path, `font-weight` in a class definition).

The owner decided that the policy keeps refusing only its security boundary: configuration directives and configuration beyond the bounded front matter, interactive links and callbacks, HTML tags in text, entities and Mermaid escape codes, resource and style injection, `@{}` metadata and math. The investigation in PREVIEW-011 establishes the grammar each family actually uses for those constructs, how HTML decides that `<` opens a tag, where a backslash can change meaning, and that the service's Content-Security-Policy already prevents inline script and external loads as an independent layer.

## Proposal

The model changes from denying broad classes and masking exceptions to refusing an explicit boundary and treating everything else as text.

1. **Configuration (kept).** `%%{` anywhere, any `---` block other than the leading one, and front matter beyond the title and bounded configuration of PREVIEW-009, unchanged.
2. **Interaction (kept, by statement).** A statement is the text at the start of a line or after `;`, read without regard to quotes so an unbalanced quote cannot hide one. A statement beginning with `click`, `callback`, `link`, `links`, `properties`, `details` or `linkStyle` is refused in every family, and the same check runs on the body of every `%%` comment. The flowchart `click <node> "<file>"` project link stays the single admitted form. C4 parameters `$link=` and `$sprite=` (including prefixed forms such as `$legendSprite=`) are refused wherever they appear.
3. **HTML (kept, by tokenization).** `<` immediately followed by `/`, `!` or `?` is refused. `<` immediately followed by an ASCII letter is refused unless it begins a complete inert placeholder on the same line: a body of letters, digits, spaces, `_`, `.`, `,`, `(` and `)` whose first word is not an HTML element name. The existing named placeholders stay admitted and dash-bearing custom-element names stay refused. Every other `<` is text: class relations, `<<annotation>>`, state `<<choice>>`, `<<fork>>` and `<<join>>`, comparisons, arrows, and `<` in titles and unquoted labels.
4. **Encoding (kept).** Named, decimal and hexadecimal entities, their legacy forms without `;`, and Mermaid `#name;` and `#123;` escape codes, with the existing exception for a colour after `:`.
5. **Resources and injection (kept).** `](`, `![`, `url(`, `@import`, `expression(`, and the script schemes `javascript:` and `vbscript:` bounded by a word boundary. `http:`, `https:`, `//` and `data:` become text, because the only statements that could turn them into a link or a load stay refused.
6. **Metadata and math (kept).** `@{` and `$$`.
7. **Backslash (kept where it changes meaning).** Refused in the front matter block, in styling declarations (already implied by the bounded values), and on raw CSS statements: Gantt `todayMarker`, sequence `box` and `rect`, any line carrying a C4 `$name=` parameter, and quadrant point styles. Admitted everywhere else.
8. **Styling (bounded, every family).** `classDef` and `style` statements take one declaration check in every family that has them. The admitted set grows from five properties to: `fill`, `stroke`, `color` and quadrant `stroke-color` taking three-, four-, six- or eight-digit hex, a CSS named colour, `transparent`, `none` or `currentColor`; `stroke-width` and `stroke-dasharray` as today; `font-weight` as `normal`, `bold`, `bolder`, `lighter` or a hundred from 100 to 900; `font-style` as `normal`, `italic` or `oblique`; `font-size` bounded in `px`, `pt`, `em`, `rem` or `%`; `opacity`, `fill-opacity` and `stroke-opacity` from 0 to 1; `rx`, `ry` and quadrant `radius` from 0 to 100. `font-family` and every other property stay refused. `class` and `cssClass` assignments and inline `:::` take identifiers only, except that `class X` inside a class diagram is a declaration and is not treated as an assignment.
9. **Everything else is text.** `&`, the words that used to be refused, addresses and backslashes in body text, lowercase placeholders, and every family's own syntax that contains none of the constructs above.
10. **Unchanged render layer.** Strict security level, HTML labels off, fixed theme and font, the SVG sanitizer and the Content-Security-Policy stay as they are; they enforce the same boundary from the other side.
11. **Label editing** keeps re-validating through the policy; its refusal message stops naming keywords that are no longer refused.
12. **Documentation.** README preview subset, architecture policy notes, task and plan records, changelog.
13. **Preview size limits (added at approval).** The owner asked for the limits to change. Measured in the installed Chromium headless shell on eight cores with the host render settings, Mermaid alone takes 0.9 s for a flowchart of 500 edges, 2.0 s for 1,000, 5.8 s for 2,000, 11.6 s for 3,000 and 39 s for 5,000, while a sequence diagram of 1,500 messages and about 98,000 characters takes 0.7 s. Rendering runs on the main thread and repeats after edits, so the character limit rises from 32,000 to 100,000 and the edge limit from 500 to 1,000: text-heavy diagrams gain the most, and the slowest admitted flowchart stays near two seconds before the host's own sanitization and style inlining.

## Deliberate reversals

These existing refusal cases become accepted, each because the owner moved it out of the boundary: `style A fill:red` and `style A opacity:0` (bounded styling); `A["Value < img src=x >"]`, `< br/>` and `<<br/>>` (a spaced or wrapped `<` is not a tag open); titles `Value < 250V`, `See https://example.test` and `Style guide`; sequence `A->>B: Value < 250V` and `Note over A,B: A & B`; `A<<->B`, `A<->>B`, `flowchart LR\nA<<->>B` and `stateDiagram-v2\n[*] <<->> Ready` (no tag, so Mermaid decides and reports its own syntax error); and `%% classDef evil opacity:0` (the comment body is now a valid bounded declaration). Every other existing refusal case stays refused unchanged.

## Risks

- **This is the largest policy change since the policy was written.** Moving from denying classes to refusing a list means a boundary construct the list fails to name would be admitted. The render settings, the SVG sanitizer and the Content-Security-Policy remain as independent layers, and the test matrix enumerates every boundary construct in every family that can express it.
- **Statement detection fails closed.** Reading statements by line and `;` without regard to quotes means a text line that begins with a refused keyword, such as a mindmap node named `link`, stays refused.
- **A missed raw CSS context** could spell `url(` with escapes. The consequence is bounded by `img-src 'self' data:` and `connect-src 'self'` to same-origin requests, whose read paths are side-effect free.
- **Placeholders in some families** pass through Mermaid's own sanitizer, which may drop an unknown element such as `<node>` from the rendered text. Nothing executes; the text may be missing from the drawing.
- **A wider named-colour list** adds surface to the declaration check only; it cannot carry a URL, selector or escape.
- **Browser and `check:ci` evidence** can only come from the hosted verify run, as for PREVIEW-009.

## Scope

`web/src/features/preview/source-policy.ts`; the refusal message in `web/src/features/preview/flowchart-labels.ts`; `flowchart-policy.test.ts` and `renderer.test.ts` for the reversals above; a new multi-family policy matrix beside them covering every boundary construct and every admitted construct from the inventory; a browser case rendering a class diagram with relations and an annotation, a state diagram with `<<choice>>`, a sequence diagram with `&`, an address and a backslash, and the owner's flowchart table with `font-weight`; README; architecture; changelog. Release as a patch version under the README rule for a widened preview policy.

The preview limits in `source-policy.ts` and `renderer.ts` and the tests that pin them are in scope since approval. Out of scope: the other render settings, the SVG sanitizer and the Content-Security-Policy.

## Alternatives

- **Keep the current model and add one mask per family per item.** Each change stays small, but the policy keeps accumulating special cases and each new family collides again.
- **Remove the policy and rely on the render layer and the Content-Security-Policy.** Simplest, but it gives up the defence in depth the owner chose to keep for the boundary.
- **Open only the lowest-risk items** (bounded styling, class and state `<`, `&`). Leaves words, addresses and backslashes refused, which the owner declined.

## Implementation record

Implemented as proposed, with the preview limits raised to 100,000 characters and 1,000 edges at approval, and two additions found during verification. First, Mermaid hides a class's `font-weight` and `font-style` on labels by marking every word span `normal`, so the renderer now lets those spans inherit before inlining styles; without it the admitted declarations would have no visible effect. Second, a `click` inside a comment, including one after a `;`, stays refused so the render projection and link extraction keep agreeing, as NAV-002 requires. The PREVIEW-010 suites and the browser attack list carried further cases that the owner's decision reverses (addresses, `data:` and backslashes in text); they are listed with the evidence in [PREVIEW-011](../task/PREVIEW-011.md).
