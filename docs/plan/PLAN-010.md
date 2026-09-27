# PLAN-010 Detect deployed builds without losing open work

- **status**: completed
- **createdAt**: 2026-09-08
- **approvedAt**: 2026-09-08 (bounded authorization for this feature); the project owner explicitly asked on 2026-09-11 to continue and finish it on the main checkout
- **relatedTask**: UPDATE-001

## Context

An open page keeps its loaded JavaScript and CSS until it navigates, so after a redeployment it can keep running an old build without any sign. The shell is served with `Cache-Control: no-store` and hashed assets with a one-hour cache, but nothing tells an open page that the deployed assets changed.

A first implementation was written on 2026-09-08 on a separate branch. Its focused unit, API and real replacement checks passed, but its combined verification never completed: it stalled on browser test process lifetime handling and a failed browser prerequisite installation, and the branch was never integrated. Since then `main` has been renamed to Merdeck and has gained file management, optional access tokens and layout changes, so that branch cannot be merged as it is. Its commits are preserved locally under the `archive/update-001-wip` tag.

## Proposal

1. **Build identity.** A SHA-256 over every built frontend resource (sorted paths, content types and exact bytes), computed after removing the page shell's own identity element. The identity is written into the shell as `<meta name="merdeck-build" content="…">`. The build writes it into `web/dist/index.html`, so served, embedded and released shell bytes stay identical to the build output. The service recomputes the same identity when it loads assets and inserts the element into an asset map that lacks it.
2. **API.** GET `/api/build` returns `{ identity, pollIntervalMs: 60000 }`, with `identity: null` when no built interface is served. It needs no session in either access mode, discloses no project, session or host details, and keeps the existing Host, Origin, method, query and no-store rules.
3. **Detection in the page.** The page reads its own identity from the meta element; development pages without it never check. It checks once when loaded, every 60 seconds while visible, and when it regains focus, visibility or connectivity. In-flight checks are coalesced, events are throttled, the existing request timeout applies and nothing retries in a loop. The checks use a query client isolated from the workspace's session cache. A detected new identity stays reported through later check failures; dismissing hides that identity only, and a later different deployment notifies again.
4. **Notice and reload.** A notice below the header says that an update is available and offers **Reload application** and **Dismiss update**. Reload is disabled, with an explanation, while any file has unsaved, retained, locked, warning or saving drafts, while a review, entry, file drawer or log-out dialog is open, while a token is being typed, or while a save, entry change, review load, sign-in or sign-out is pending. An action-time guard re-checks the latest draft state synchronously and marks navigation as started, so that no save can begin afterwards. The detector never saves, reloads, merges or clears anything on its own. The notice also appears on the sign-in page.
5. **Tests.** Backend: the identity snapshot (stability, order independence, idempotence, sensitivity to any resource change, the shell requirement) and the HTTP endpoint (both access modes, refusals, no-store, `null` without a built interface, the element in the served shell). Web: identity decoding, the check lifecycle with fake timers, the reload guard, the notice, and the workspace guard, including a save that would start after reload was chosen. Browser: against the real built service, a page whose first shell carries an older identity shows the notice, keeps reload disabled while a draft is unsaved, reloads after saving and then shows no notice, and a dismissed identity stays hidden.
6. **Real replacement.** Verified once on this machine with two built variants of the same commit that differ in one CSS resource, served in turn from the same origin to a page left open. The record shows that the notice appears and that reloading loads the new resource. The automated suite does not replace running services.
7. **Documentation.** README usage and API sections, the architecture, the task record, the changelog and the deployment record.

## Risks

Reloading discards in-memory state, so the guard must cover every kind of retained work, and it errs on the side of blocking. A page loaded before this feature cannot detect anything, so the first deployment of it needs one manual reload. The identity covers frontend assets only, not backend-only changes.

## Scope

`src/shared/application-build.ts`, `src/app.ts`, `src/shared/contracts.ts`, `scripts/build.ts` and the API and static tests; `web/src/features/update/`, the workspace hook and page, their tests and one browser spec; documentation. Out of scope: service workers, persistent drafts, automatic reloads, version numbers or deployment timestamps, and any change to file, authentication or storage behaviour.

## Alternatives

A random identity per service start would notify after every restart even without asset changes. A package version would miss rebuilds. A service worker adds caching complexity that this single-origin tool does not need. Replacing running services inside the automated browser suite is what stalled the first attempt; a routed older shell identity exercises the same page behaviour against the real service, and one recorded replacement covers the real deployment path.

## Implementation record

Implemented as proposed on the main checkout and committed as `e5de951`, with three refinements: the notice appears only when an update is available, so a failed check adds no notice on its own; the page's unload prompt is unchanged; and an in-flight session refresh does not disable reload. The full source gate and the browser suite (41 of 41) passed. A real same-origin replacement between two disposable deployments showed the notice and loaded the new stylesheet after reload, and the hosted instance was relaunched with the build and checked live. Evidence is recorded in [UPDATE-001](../task/UPDATE-001.md) and the [deployment record](../deployment-domain.md).
