# STACK-001 Establish the stack and contracts

- **status**: completed
- **priority**: P1
- **owner**: Tooling maintainer
- **completedAt**: 2026-09-07 18:09
- **createdAt**: 2026-09-07 17:42

## Description

Create the TypeScript Bun + Hono root API and sibling React + Vite package without workspaces. Add reproducible setup and quality scripts, strict configuration, separate lockfiles, typed file/block/version/error/revision contracts and validated environment configuration. Verify stable dependencies and official APIs before installation; record compatibility pins. Provision the pinned runtime locally and resolve the bootstrap/runtime mismatch before application verification.

Honor shadcn/ui base-nova, `@base-ui/react`, Tailwind, file-based TanStack Router and TanStack Query. Follow existing component -> shadcn CLI -> Base UI wrapper sourcing and record any custom primitive justification. No application database or storage library. Expose production and independent development startup boundaries with safe loopback defaults and project-local nsl, without Vite embedded in Hono.

## ActiveForm

Establishing the stack and contracts

## Dependencies

- **blocked by**: BOOT-001
- **blocks**: DESIGN-001

## Notes

- Claim before investigation and re-read this detail and the index. Read [PLAN-001](../plan/PLAN-001.md), [architecture](../architecture.md) and [runtime decision](../decisions/2026-09-07-runtime-and-scope.md). Persist investigation and proposal here before implementation under the original authorization.
- Read the backend runtime/delivery/testing and frontend routing/runtime/review references before choosing actual scripts and contracts. Finalize route prefixes so development nsl stripping and production `/api` mounting have identical public behavior.
- Planned checks: `bun --version`, `bun info <package> version`, relevant official API and peer range review, `bun install --frozen-lockfile`, and `(cd web && bun install --frozen-lockfile)`.
- Planned gates: `bun run lint && bun run typecheck && bun test --coverage && bun run build`; `(cd web && bun run lint && bun run typecheck && bun run test && bun run build)`. Frontend tests must include coverage. Do not claim MVP acceptance from scaffold checks.
- Verify project-local `nsl get <unique-project-name>`, route listing and HTTP access in tmux once a real server exists. A planned URL is not evidence; production smoke must also work without nsl.
- Completion evidence must identify installed versions, exact commands/results, contract locations and unresolved gaps. Completed evidence is recorded below.

### Investigation

The foundation is documentation-only and the task was claimed before investigation. The installed Bun is 1.3.12 while the declared stable pin is 1.4.2; Node 24.20.0 is present. Official npm metadata was checked for every planned direct dependency on 2026-09-07. Stable versions include TypeScript 7.0.2, Hono 4.13.7, Zod 4.5.4, React 19.2.8, Vite 8.2.2, Tailwind 4.3.3, shadcn 4.21.0 and Vitest 5.0.0. Published runtime and peer ranges permit the declared Node runtime. No existing primitives or source behavior need preservation. Preliminary authentication, module and change-stream text must be aligned with the clarified scope.

### Proposal

Under the original 2026-09-07 implementation authorization in PLAN-001, provision Bun 1.4.2 in ignored project storage and install exact registry-verified versions into two independent private packages. Implement validated explicit DIAGRAMDOCK_ROOT configuration, mandatory startup token, typed contracts/errors and a minimal health-only Hono composition. Reserve authenticated session login/logout, CSRF/Origin protection and bounded revision polling contracts for subsequent HTTP implementation. Use src/modules/diagrams for the file domain. Mount the same domain router at /api normally and / in explicit development prefix-stripped mode. Add file routes, Query/Theme providers, official base-nova generated primitives, semantic CSS tokens, meaningful config/contract/theme tests and complete quality scripts. Build emitted application files without source rewriting. Production static delivery, authentication endpoints, file engine, editor, renderer and prototype remain later tasks; prototype status remains needs-review.

Risks: current major tooling may expose peer incompatibilities; record and verify any compatibility pin rather than silently downgrade. Generated primitives may need lint normalization while retaining CLI provenance. Test discovery and source-only imports must preserve independent runtimes. Alternatives considered: a watcher/stream service adds lifecycle complexity without improving the bounded MVP; polling with explicit reconciliation is sufficient. No database, workspace, remote host, global runtime mutation or extra UI ecosystem is needed.

Compatibility finding: the installed typescript-eslint 8.69.0 rejects TypeScript 7.0 and declares a TypeScript range below 6.1. Use the latest registry-verified stable 6.0 patch for both packages until the lint stack supports 7.x. This routine tooling correction preserves strict TypeScript and the approved stack. The local nsl daemon uses port 3003, so the development launcher must discover its actual URL rather than assuming 3355.


### Implementation and verification

Implemented the private root API and independent private web package with two committed Bun locks, strict TypeScript, complete scripts, Zod configuration, typed document/save/tree/revision/session/error contracts, health-only Hono composition, file-based routing, Query/Theme/Tooltip providers and ten CLI-sourced base-nova primitives. Samples include both standalone extensions and a Markdown document with surrounding prose, a non-diagram fence and two Mermaid fences. Canonical contracts and future enforcement requirements are documented in architecture; no auth/file/editor/renderer endpoint was introduced.

Actual runtimes: project-local `.cache/runtime/bun-1.4.2/bun` reports 1.4.2 on Linux aarch64, Node v24.20.0, TypeScript 6.0.3, Vite 8.2.2, Vitest 5.0.0, Playwright 1.63.0 and nsl 0.1.7. The [compatibility decision](../decisions/2026-09-07-stack-compatibility.md) records every direct manifest pin and official/CLI provenance. System runtime and unrelated projects were preserved.

The exact required command passed with the pinned Bun PATH in the project tmux session:

```bash
export PATH="$PWD/.cache/runtime/bun-1.4.2:$PATH"
bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check && git diff --check
```

Evidence in ignored `tmp/check.log` and `tmp/check.status` (0): both frozen installs unchanged; both lint and strict typecheck gates passed; backend 14 tests with 86 assertions passed; frontend 8 tests passed; production build emitted `dist/index.js` and `web/dist/`. Backend coverage reported 100% functions/lines for app/config/contracts/errors; selected frontend theme/HTTP boundary coverage reported 100% statements/branches/functions/lines. Both `coverage/lcov.info` and `web/coverage/lcov.info` are nonempty. This is coverage of implemented boundaries, not unimplemented MVP acceptance. A source SHA-256 manifest comparison before/after the final build confirmed no source rewriting.

`bun pm ls --all` and `(cd web && bun pm ls --all)` were captured and checked using `rg '@radix-ui|@mui/|@mantine/|@chakra-ui|antd@|@headlessui|@ariakit|@nextui|@park-ui|daisyui|flowbite|react-aria-components'`; no forbidden dependency matched. Source inventory contains TypeScript/TSX, CSS and the HTML shell, with no hand-authored JavaScript application source. The standard generated route tree remains generated and excluded from lint.

### Preview and production evidence

`node_modules/.bin/nsl get diagramdock-85c965` returned `http://diagramdock-85c965.localhost:3003`. `node_modules/.bin/nsl list` showed the frontend and `/api` route with prefix stripping. This URL is local-machine only. HTTP was verified using:

```bash
curl --noproxy '*' --resolve diagramdock-85c965.localhost:3003:127.0.0.1 -fsS http://diagramdock-85c965.localhost:3003/api/health
curl --noproxy '*' --resolve diagramdock-85c965.localhost:3003:127.0.0.1 -fsS http://diagramdock-85c965.localhost:3003/
```

Both returned expected health JSON/HTML. The actual daemon uses 3003 rather than its documented default, and the launcher discovers that URL. Development servers remain in the project tmux session for local review; no host browser was launched and no external-domain access was verified.

`PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" bun run --cwd web playwright install chromium` provisioned the browser only in project-owned storage. The tmux-run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" bun tmp/browser-smoke.ts` passed: starter heading, keyboard focus and theme cycle, dark preference after reload, browser same-origin API health fetch, desktop/mobile layout without horizontal overflow, and no page/console errors. Screenshots were inspected at `tmp/scaffold-desktop.png` and `tmp/scaffold-mobile.png`; result is in `tmp/browser-smoke.log` and status 0. This is the starter page, not the design prototype or editor.

A separate tmux production smoke ran `PORT=18787 NODE_ENV=production DIAGRAMDOCK_API_MODE=prefixed bun run start` with explicit sample root and an ephemeral private token. `curl -fsS http://127.0.0.1:18787/api/health` returned 200; requests to `/api/missing` and `/` returned 404 JSON. The production process uses built output and no nsl. The temporary production listener was stopped after verification.

`bun run test:e2e` was also checked: exit 1 with `Error: No tests found`, as documented. Its dedicated Playwright config isolates future `web/src/test/e2e/*.spec.ts` tests from Vitest and sends output into project `tmp/`. No placeholder E2E pass is claimed.

### Review and remaining work

Local implementation review covered configuration redaction, immutable injection, path/selector contracts, production/dev API mounting, source-only frontend imports, theme lifecycle, CLI provenance, build reproducibility and runner separation. Resolved findings: invalid Origin refinements initially threw raw URL exceptions; explicit `coverage=false` overrode the Bun coverage flag and was removed; TypeScript 7 lacked the lint API; the nsl port could not be assumed. All were corrected and the exact final gate passed. No unresolved high-confidence defect remains within the scaffold scope.

Remaining: prototype and its needs-review metadata; actual root containment/byte-preserving atomic file service; cookie session/login/logout, Host/Origin/CSRF and rate limits; bounded revision polling endpoints; safe Mermaid rendering, editor/draft handling, built SPA asset delivery; full acceptance/critical-flow browser suite and final integration review. The overall plan remains implementing and the design remains unapproved.
