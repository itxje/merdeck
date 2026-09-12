# PLAN-021 Open a linked diagram from the preview

- **status**: draft
- **createdAt**: 2026-09-12
- **approvedAt**: (pending)
- **relatedTask**: NAV-001

## Context

An index diagram in the owner's project gives every node the file it stands for, eighteen times, as `click <node> "<file>.mmd"`. The preview policy refuses the word `click` with `href`, `link` and callbacks, because Mermaid's click grammar can bind a URL or a JavaScript callback to a rendered node. That refusal costs the whole diagram today, and the link itself would not work anyway: the sanitizer removes anchors and `href` attributes from the rendered SVG, so a Mermaid link is already inert here.

The workspace, on the other hand, already navigates between files: the file explorer, the tree and the entry operations all call one navigate function, and the preview already talks back to the workspace through callbacks for errors, edits and label locations. A node that names a project file is therefore closer to a tree row than to a hyperlink.

## Proposal

1. **One accepted form.** `click <identifier> "<path>"` where the identifier follows the existing rule and the path is a project-relative path in the same shape the API accepts, without a leading slash, without any `..` segment and ending in `.mmd`, `.mermaid` or `.md`. Every other form — `call`, `href`, a URL, a second argument, an unquoted target — stays refused, and so does the word anywhere else.
2. **Validated statements leave the checked source.** A validated `click` statement is masked like a class definition, so the disabled-word check still refuses everything the first rule did not admit, and an unvalidated statement cannot reach Mermaid.
3. **Navigation belongs to the application, not the renderer.** The preview reads the same statements itself, keeps a map from node identifier to target path, and attaches its own handler to the rendered node. Mermaid's anchors and `href` attributes stay stripped exactly as they are now, so no link the renderer produced is ever followed, and no URL, `window.open` or target attribute is introduced.
4. **Resolution.** A target resolves against the directory of the file being viewed, stays inside the project root, and opens that file's first block through the navigate function the workspace already uses. A target that is missing, unreadable or outside the root leaves the diagram as it is and states why, in the existing preview note area.
5. **Reach.** A node with a target carries a pointer cursor, an accessible name that says what it opens, and focus with keyboard activation, so the same targets work without a mouse.
6. **Unsaved work.** Navigation keeps drafts exactly as the explorer does today; nothing new is discarded.
7. **Documentation.** The README preview subset, the architecture rendering and policy notes, the task and plan records and the changelog.

## Risks

- Attaching a handler to rendered content is new interaction surface. It is bounded to nodes named by a validated statement, it carries no URL, and the sanitizer keeps stripping anchors, so the rendered SVG stays inert on its own.
- A node can now move the workspace to another file. A stale or wrong target is a navigation, not a write, and the file it opens is subject to every existing read check.
- The preview gains a second reason to parse the source. It already parses flowcharts for label editing, and the click map reuses that pass rather than adding another.
- Mermaid keeps its own click handling for the source it receives. The plan neutralises it by sanitizing as today; if a future Mermaid renders links differently, the sanitizer, not this feature, remains the boundary, and its tests must keep proving anchors and `href` are removed.

## Scope

`web/src/features/preview/source-policy.ts`, a click-map module beside it, `preview.tsx` for the handler and the accessible name, `workspace.tsx` for resolution and navigation, their tests, a browser case that follows a link between two real files, and the documentation above. Out of scope: external URLs, callbacks, tooltips, links in Markdown blocks, and any change to sanitization or to the file API.

## Alternatives

- **Keep refusing `click`**: the owner strips eighteen lines from the index and the diagram renders, with no navigation.
- **Let Mermaid handle links** with a looser security level: re-admits arbitrary URLs and callbacks into rendered content, which the policy exists to prevent.
- **Render the targets as an explicit list beside the diagram**: no interaction surface in the diagram, but it duplicates the index the diagram already is.
