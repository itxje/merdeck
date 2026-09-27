# PLAN-001 Deliver the DiagramDock MVP

- **status**: completed
- **createdAt**: 2026-09-07 17:42
- **approvedAt**: 2026-09-07 (original user authorization; date precision only)
- **relatedTask**: BOOT-001, STACK-001, DESIGN-001, FILE-001, SAVE-001, API-001, UI-001, TEST-001, NATIVE-001, CI-001, REVIEW-001, DOC-001

## Context

DiagramDock is a standalone lightweight service for browsing, rendering, and editing Mermaid diagrams in server-side project files. The inspected repository began with an empty initialization commit, no existing code or configuration, no license, no local changes, and no remote. There is no existing application call chain to preserve. BOOT-001 establishes the documentation and hygiene baseline; later tasks implement the application.

The required architecture is TypeScript throughout, Bun + Hono at the root and a sibling React + Vite SPA in `web/`, without workspaces. Storage stays in project files; the backend's database defaults do not apply. The UI uses shadcn/ui base-nova, Base UI, Tailwind, file-based TanStack Router and TanStack Query. See [architecture](../architecture.md) for proposed module boundaries and [runtime and scope decisions](../decisions/2026-09-07-runtime-and-scope.md) for version evidence and deviations.

The inspected environment has Bun 1.3.12, Node 24.20.0, npm 11.19.0 and tmux 3.5a. No installed nsl command was found. Official metadata on 2026-09-07 identifies Bun 1.4.2 as stable, Node 24.20.0 as latest LTS, Vite 8.2.2 and nsl 0.1.7. Only runtime pins are introduced by bootstrap; application dependencies require fresh registry, peer dependency and official API checks in STACK-001.

## Proposal

### Project files and selection

- Require an explicit server startup `DIAGRAMDOCK_ROOT`; fail closed when missing, invalid, unreadable, or not a directory. Never infer the root from the working directory or accept a root supplied by the browser. Resolve it once to an approved canonical root and validate it throughout the file service lifecycle.
- Browse a bounded tree of supported regular `.mmd`, `.mermaid`, and Markdown `.md` files beneath that root. Hide repository internals, dependency trees, secrets and temporary files. Return relative names only, with empty, unreadable, unsupported, oversized and missing-file states. No arbitrary download endpoint.
- Standalone Mermaid files provide one editable diagram. Markdown files expose every supported Mermaid fence as a separately selectable block, including multiple blocks in one file. Track block identity with the full-file version, ordinal and original source span so an old selection cannot silently retarget after an external edit.
- Preserve every byte outside the chosen Markdown content span, including prose, other fences, delimiters, indentation, BOM and CRLF/LF line endings. Use source offsets rather than parsing and serializing the entire document. Support backtick and tilde fences and define nested/indented fence behavior with fixtures; reject an ambiguous edit instead of corrupting a document. A source change must not accidentally terminate its surrounding fence.
- Include a non-sensitive sample project with both standalone extensions, Markdown with multiple blocks, and representative syntax/errors. It is an explicitly selected project root, not an automatic fallback.

### Save correctness and filesystem boundary

- Centralize all project reads, writes, tree traversal and change detection in one root-scoped service. Validate relative paths, reject absolute paths, traversal, encoded traversal after transport decoding, null bytes, incompatible separators and unsupported extensions. Containment must compare path components, never a string prefix alone.
- Reject symlink entries and symlink ancestors below the canonical root; validate the destination and parent immediately around I/O. Use descriptor/no-follow checks where the supported runtime permits them, reject non-regular files, and never follow external targets. Tests include sibling-prefix escapes, symlink loops, replaced ancestors and changed destinations. A failed containment check must produce no outside reads or writes.
- Every read includes a cryptographic content version of the complete file. A save requires the version and selected block identity from that read. Serialize saves to the same canonical file, re-read and compare within the lock, apply the selected edit, then commit using an exclusive temporary sibling file plus atomic rename on the same filesystem. Flush, retain suitable file permissions, clean temporary files on failure, and revalidate containment before commit.
- Stale versions return a conflict with a safe recovery path; never silently overwrite or offer an unconditional force-save default. Concurrent clients saving the same version must yield one accepted write and a conflict for the other. A successful response returns the new version. A client changing source while a save is in flight must remain dirty for the newer edits.
- Service serialization does not establish a distributed lock against arbitrary external programs. Recheck external versions as late as possible, test changes during save preparation, and document the remaining external writer race. The supported deployment is a single service instance per project root owned by a trusted local operator. Hostile local filesystem mutation requires OS isolation; application path checks alone are not claimed as an OS security boundary.

### HTTP, authentication and notifications

- Validate environment configuration and every query/body at the boundary with Zod; use typed errors, safe response codes, bounded body/file/tree sizes and readable failure messages without absolute filesystem paths. Keep transport separate from file-domain logic.
- Bind to `127.0.0.1` by default. Require a strong startup token for every binding, including loopback. Exchange it through a same-origin login form for a bounded in-memory server session and an HttpOnly, SameSite=Strict cookie scoped to public `/api`. Validate exact allowed Host/Origin values; authenticated mutations additionally require a session-bound CSRF token. Provide logout and expiry, bound failed authentication attempts, and keep credentials out of URLs, persistent browser storage, client environment variables and logs.
- Use bounded tree and selected-document revision polling, defaulting to 3 seconds and configurable from 1 to 30 seconds. Pause background-tab polling; reconcile on focus/reconnect/manual refresh and show disconnected/stale state on failures. Represent rename as deletion plus creation. Do not introduce a watcher/stream subsystem for this MVP.
- Send only root-relative metadata and selected diagram source. TanStack Query refreshes clean buffers; dirty buffers retain local source and show external-change/deletion state. Missing files must not be recreated by stale saves. A truncated tree cannot prove deletion.
- Production serves the built SPA and `/api` from one origin without nsl. Configure exact allowed origins and trusted proxy behavior explicitly; do not trust forwarded headers by default. Document TLS and credential redaction. The domain module path is `src/modules/diagrams/` and shared types/schemas are `src/shared/contracts.ts`; frontend uses type-only imports. See architecture for exact endpoint and selector semantics.

### Rendering and interaction

- Use Mermaid in strict mode with host-controlled security settings that document directives cannot weaken. Do not execute surrounding Markdown or insert arbitrary file HTML. Disable callbacks, unsafe links and remote resource loading; sanitize/contain generated SVG before mounting and verify hostile payloads in a real browser. Strict mode is one control, not a substitute for output verification.
- Show a practical file tree, source editor and diagram preview. Provide explicit Save, dirty/saving/saved/conflict indicators, selected-block controls, source errors, reset/fit and zoom controls, loading, no-file, no-diagram, empty-project, permission-error, disconnected and deletion states. Keyboard use, visible focus, labels and readable contrast are acceptance criteria.
- Keep source editing lightweight; prefer the existing shadcn textarea for the MVP. A full code editor dependency is optional only after a documented need. Keep the latest valid preview available during a source error with an honest stale-preview label; never imply invalid source rendered successfully.
- English UI and documentation. Theme preference supports light, dark and system. Server state lives in TanStack Query; local draft/selection/zoom state stays separate from server responses so refreshes cannot overwrite unsaved input. File-based routes may retain relative file/block selections, with validation and no credentials in URLs.

### Design assumptions and prototype

- Adopt one restrained developer-tool layout: compact header, roughly 240 px desktop tree, source and preview sharing remaining width, source in a monospace font, system font for controls, neutral surfaces and one muted accent. Use semantic theme tokens and restrained borders. These sizes and colors are assumptions, not user-approved design.
- On medium screens collapse the tree; on narrow screens use a file drawer and source/preview tabs with usable touch targets. Avoid squeezing three panes into a phone viewport. Desktop starts in split mode. Use light/dark/system themes and reduced-motion support.
- DESIGN-001 reads the full design methodology, matching preview/tool reference, high-fidelity and interactive-prototype references, and design-system consumption/asset metadata instructions. Produce TypeScript-authored, bundled self-contained HTML and copied assets in `designs/diagramdock/`; carry its tokens, hierarchy and states into the app.
- Asset metadata stays `needs-review`. Set `designSystems: []` unless a real packaged design-system manifest is imported; use of the required component stack alone is not a packaged design-system import. There is no user-reviewed prototype yet. Verify the prototype over HTTP and inspect it in a browser before claiming a preview works.

### Verification and delivery

| Stage | Required evidence |
| --- | --- |
| Bootstrap | Required files nonempty, valid links, exact task chain, English-only neutral text, original authorization provenance, staged whitespace check, correct ignore behavior |
| Stack | Fresh stable registry/official API checks, recorded compatibility pins, separate committed lockfiles, strict TypeScript, no forbidden UI packages, reproducible installation and real lint/typecheck/build/test scripts |
| Files | Byte-preserving multi-block edits; BOM/CRLF/fence fixtures; traversal/symlink/non-regular/oversize rejection; atomic failure cleanup; stale and simultaneous save conflicts |
| API | Startup validation, loopback/non-loopback auth, Host/Origin rejection, redaction, malformed inputs, all-route auth, session expiry/logout, revision reconciliation, deletion/rename/atomic replacements |
| UI | Real render/edit/save/reload and block selection; dirty state across notifications/navigation/in-flight saves; zoom/fit; error recovery; light/dark/system, keyboard and responsive states |
| Acceptance | Full checks with coverage, browser screenshots and assertions, no unexpected console errors, no executable payloads or outbound diagram resources, reproducible production smoke with nsl absent |
| Review and delivery | Resolved implementation/security findings, tested README/setup/sample, precise preview reachability and limitations, clean diff and final main-integration review |

Planned application gates, to be implemented by STACK-001 and expanded as meaningful tests arrive:

```bash
bun run lint && bun run typecheck && bun test --coverage && bun run build
(cd web && bun run lint && bun run typecheck && bun run test && bun run build)
bun run test:e2e
```

The frontend test gate must include coverage; target at least 80% for meaningful exercised application code, with justified exclusions recorded. A placeholder test is not acceptance evidence. Final instructions must reproduce clean dependency installation with `bun install --frozen-lockfile` in each package, startup with an explicitly selected sample or operator root, production build/start, and all gates. None of these application commands exists at bootstrap.

Development servers, watchers and long test processes run through project-named tmux sessions. Prefer project-local nsl routes for the independent API and SPA and verify the route with `nsl get`, route listing and HTTP requests. A `.localhost` URL is local to the machine; report broader reachability only when actually configured and verified. Do not auto-launch a host browser. Keep logs and screenshots under ignored project `tmp/`. File checks explicitly choose a canonical supported fixture parent; exclusively created disposable scratch is authorized for deployment verification.

### Current practical-save and delivery clarification (2026-09-07)

SAVE-001 supersedes FILE-001 for practical file-service acceptance; historical failures stay retained. External editors continue to edit original files directly. Already-detected stale changes conflict and detected deletion remains deleted. The final comparison/rename window is an explicit optimistic-save limitation, not a universal-no-loss requirement; PLAN-003 keeps its diagnostic applicationSafetyPassed=false. Writes require the verified Linux overlayfs contract in PLAN-004, with a separate real unsupported-write refusal check. HTTP path controls do not isolate an OS actor that can move root/ancestors. Later API/UI/browser/binary checks must exercise that same documented deployment filesystem.

The user has also authorized CI and single-executable release work between TEST-001 and REVIEW-001. PLAN-002 records the authorized 2026-09-07 CI/version-tag and single-executable clarification. Distribution must embed the runtime, backend and complete Vite assets without target-host runtimes or separate frontend files. Actual Linux x64/native source and executable-browser gates remain distinct from local arm64/overlay checks. No first version has been selected. The exact authorized origin is git@github.com:itxje/diagramdock.git; no additional hosting dependency is introduced. Final integration into main remains the separate explicit approval boundary.

## Risks

- Path validation can have time-of-check/time-of-use gaps, and symlink or directory swaps can violate containment if handled only with string normalization. SAVE-001 must verify the retained I/O strategy, test race cases, and report unsupported guarantees before exposing an endpoint.
- Whole-document serialization, unstable block ordinals and fence injection can corrupt Markdown. Byte-span replacement tied to a full-file version plus adversarial fixtures is mandatory.
- Atomic rename prevents partial contents but does not alone prevent lost updates. Serialization, content versions and late revalidation address service races; external writer limitations must stay explicit.
- Polling can observe changes late and truncated trees omit files. Bounded content revisions, explicit selected-file checks, reconciliation and visible disconnection are required; dirty input must survive refreshes.
- Rendering untrusted source can introduce SVG/HTML execution, unsafe navigation or resource exhaustion. Enforced strict settings, constrained output, bounded input and browser attack fixtures are required.
- A loopback listener can still be targeted by browser-origin requests. Host/Origin and authentication checks are necessary; shared-host or proxied use requires explicit deployment guidance.
- The original system Bun is older than the selected runtime. Bun 1.4.2 is provisioned in ignored project storage; application checks must use that verified binary. Exact pins, compatibility exceptions and separate lockfiles are recorded as dependencies are introduced.
- The design is assumed and remains unreviewed; routine design defaults are authorized, but a material feature expansion requires a separate concrete proposal.

## Scope

Sequential tasks: BOOT-001 -> STACK-001 -> DESIGN-001 -> SAVE-001 -> API-001 -> UI-001 -> TEST-001 -> NATIVE-001 -> CI-001 -> REVIEW-001 -> DOC-001. See [task index](../task/index.md). Each successor stays pending and unassigned until its predecessor completes and its own claim is recorded. Shared manifests/lockfiles and indexes are updated in this sequence.

In scope: local file browsing, Mermaid blocks, safe edits, preview/zoom, change notifications, necessary auth/validation, responsive design/prototype, sample data, automated checks and reproducible docs. Bootstrap itself changes only documentation and repository hygiene; later tasks own application/design/test paths.

Out of scope: databases or storage libraries, cloud accounts, remote Git hosting other than the explicitly authorized origin, uploads as the primary workflow, generated diagram features, collaborative editing engines, visual graph editing, multi-instance locking, file creation/rename/delete controls, and public open-source licensing.

## Alternatives

- Root API plus sibling SPA is simpler than workspaces for one application and keeps development processes independent. No workspace is justified.
- Direct files meet the requirement without database state, migrations or synchronization drift. A database would duplicate the user's source of truth.
- Plain Hono plus Zod is sufficient for this small private API; generated API explorers and ORM defaults are unnecessary. Keep typed route contracts discoverable in code and docs.
- Byte-span fence extraction preserves unrelated bytes better than Markdown serialization. A parser with trustworthy source offsets may be used if complexity warrants it; no renderer is needed for surrounding Markdown.
- Bounded tree/content revision polling is sufficient for the MVP and avoids watcher/stream lifecycle complexity. A degraded connection must be visible and reconciled without losing drafts.
- A shadcn textarea is sufficient for source editing initially; a heavier editor must justify its cost. The required UI ecosystem remains fixed in either case.
- All rights reserved preserves the owner's choice of future license. Selecting a public license now would grant rights without authorization.

## Annotations

- Original user authorization was supplied on 2026-09-07, at day-level precision. It explicitly permits MVP implementation, initial implementation assignment, and routine corrections and design defaults within this scope. No later approval time is asserted.
- BOOT-001 was claimed before substantive investigation. Findings and this proposal were persisted before repository hygiene implementation. The plan is `implementing` on the strength of the existing authorization, not because a prototype has been approved.
- Prototype status is unreviewed; produced asset metadata must remain `needs-review` until actual review changes it.
- Final integration into main is a separate boundary: complete all implementation, checks, design evidence and review first; present the concrete diff, verification results, remaining limitations and integration plan for explicit user approval. This plan does not authorize that final merge. Material new scope similarly requires a concrete, reviewable proposal before approval.
- The plan must remain `implementing` until final delivery checks actually pass. Completing bootstrap or a later individual task does not complete the MVP.

### Acceptance handoff clarification

Delivery preparation may start from the accepted finite review while its focused correction and native evidence assessment continue. DOC-001 records this bounded stage split: correct the concrete documentation drift and verify source setup now; retain final REVIEW-001 and actual corrected native source/executable acceptance as completion dependencies. DOC-001 remains in progress and this plan remains implementing. This uses the original 2026-09-07 authorization and does not record a new approval, a user-approved prototype or final main integration.

The acceptance implementation adds a reproducible tmux browser runner with explicit supported/unsupported fixtures and retained existing-service URLs for subsequent executable tests. TEST-001's matrix distinguishes real storage/browser checks from controlled transport/fault-injection cases. The delivery chain continues through NATIVE-001, CI-001, REVIEW-001 and DOC-001. Ordinary Linux native and executable-only acceptance remain pending until independently verified; local overlay evidence does not waive them. The prototype remains needs-review and final main integration retains its separate approval boundary.

PLAN-005 records the authorized delivery applicability correction: the configured existing project directory and direct external tools remain the primary workflow. Native verification preparation can proceed to CI construction without native acceptance, but production admission remains narrow until actual native behavior justifies a focused correction. Final delivery requires the deployed executable's native browse/render/edit/save, external conflict and containment evidence with exact remote run URL, commit and filesystem identity. A negative control or workflow file cannot satisfy that gate.

### Delivery preparation evidence (2026-09-07)

DOC-001 corrected the finite review's P3 documentation drift and verified fresh pinned/frozen source setup, production build, real HTTP save/conflict smoke, four existing workspace browser cases and nine unchanged prototype verification groups at source `4ca471274d3ffa76469f8b2e87d4abd7055aa764`. Exact commands, local URLs, storage identities, screenshots, retained preview lifecycle and preservation checks are in [DOC-001](../task/DOC-001.md). No new full coverage or executable gate was run for the documentation-only preparation. Historical per-implementation binary results remain distinct from this combined source smoke. Final corrected review and actual hosted ext4/Linux x64 source/executable acceptance are still required; DOC-001 remains in progress and this plan remains implementing. The original failed hosted run, practical save/OS-actor limits, needs-review prototype and separate final main-integration approval boundary are unchanged.

### Supplied review and hosted progress (2026-09-07)

Independent P2 correction review is reported resolved at `e70dd9c`, report `a50e53c` integrated at `3cfe519605a15e43d937c5269794ccc4f76c3ba1`; the supplied baseline five-case control retained two expected failures, followed by five corrected browser passes and 25 focused passes. Public metadata for [run 34168525432, attempt 1](https://github.com/itxje/diagramdock/actions/runs/34168525432) reports completed success at exact candidate `4ca471274d3ffa76469f8b2e87d4abd7055aa764`, successful native source/executable step and artifact retention, with publication skipped. DOC-001 records the supplied provenance and artifact identity without inventing detailed native counts, filesystem/device, hashes, traces or cleanup evidence. Those details, the native-policy delta review and independent P3 confirmation still gate final delivery. Prior dated pending statements describe the earlier evidence state; the failed first run remains retained. DOC-001 stays in progress and this plan stays implementing. No final main integration, release or prototype approval is recorded.

### Verified native delivery evidence (2026-09-07 23:15)

The detailed evidence subsequently supplied for [run 34168525432, attempt 1](https://github.com/itxje/diagramdock/actions/runs/34168525432) satisfies the native/Linux x64 source and single-executable gate at clean candidate `4ca471274d3ffa76469f8b2e87d4abd7055aa764`. DOC-001 inspected the actual log/stage/audit records and already downloaded package: actual ext4 `0xef53` / device `2049` / mount `27` / `8:1`, separate tmpfs refusal `0x1021994` / device `26` / mount `32` / `0:26`; all 22 source stages and the complete 24-case executable browser/93-asset aggregate passed with cleanup. Strict package identity, checksum and x86-64 ELF inspection passed without local x64 execution. Exact command/count/hash evidence and the unavailable raw trace/probe-file limits are in [DOC-001](../task/DOC-001.md).

Earlier pending notes record their evidence state at the time, and the first hosted run remains failed. The source-only pending label is superseded by the later complete binary aggregate, not rewritten. Native acceptance does not remove the practical final comparison/rename window or local OS actor limitations; the historical diagnostic remains applicationSafetyPassed=false. P2 and policy review are supplied as passed; final independent P3 documentation confirmation remains the delivery dependency. DOC-001 stays in progress and this plan stays implementing. Publication was skipped, first release version is unchosen, prototype status remains needs-review, and final main integration retains its separate explicit approval boundary.

### Reviewed implementation completed (2026-09-07 23:26)

The implementation deliverable and DOC-001 are complete after accepted final review `a0f0f039ed20fd3289717898a8f8d4a349db0555` at documentation `7d6d720`, integrated at `eabc4d7263156a343762d2e50e573037f6f5f3c8`. P2/P3 and native policy/execution/artifact acceptance passed with no remaining actionable findings. Actual native source/executable evidence remains tied to [run 34168525432](https://github.com/itxje/diagramdock/actions/runs/34168525432) and clean source `4ca471274d3ffa76469f8b2e87d4abd7055aa764`; final documentation/status and retained local source/prototype HTTP checks are recorded in [DOC-001](../task/DOC-001.md). FILE-001 is administratively closed as superseded by completed SAVE-001, retaining its unresolved failure history rather than declaring it passed.

This completes the reviewed implementation on the delivery branch, not final integration into main. The original 2026-09-07 authorization remains the only approvedAt event; explicit approval of a concrete main-integration result remains pending. Earlier dated pending notes retain chronology. Practical save/OS-actor and platform/raw-evidence limits, the first failed run and applicationSafetyPassed=false diagnostic remain unchanged. Prototype status is needs-review, the first release version is unchosen, and no Git tag, published release, deployment or main merge is recorded.
