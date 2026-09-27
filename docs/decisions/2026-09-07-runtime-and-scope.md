# Runtime pins and file-only scope

Date: 2026-09-07. Status: adopted for the authorized MVP; bootstrap observations are retained below; completed scaffold compatibility evidence is in STACK-001 and the stack compatibility decision.

## Evidence and pins

| Item | Observed value | Decision |
| --- | --- | --- |
| Bun npm stable tag | 1.4.2 | Pin `engines.bun` and `.bun-version` to 1.4.2 |
| Installed Bun | 1.3.12 | Do not use this as evidence for the pinned application runtime |
| Node current release | 26.8.1 | Current line is not required for this MVP |
| Node latest LTS and installed Node | 24.20.0 | Pin `engines.node` to 24.20.0 for development tooling |
| Vite stable metadata | 8.2.2; Node `^20.19.0 || >=22.12.0` | LTS pin satisfies the published range; dependency installation remains pending |
| nsl stable metadata | 0.1.7; Node `>=16` | Project-local development dependency planned; no installed command found |

Stable/runtime metadata was checked on 2026-09-07 using:

```bash
curl -fsS https://registry.npmjs.org/bun/latest | jq '{name,version,engines}'
curl -fsS https://nodejs.org/dist/index.json | jq '.[0] | {version,date,lts}'
curl -fsS https://nodejs.org/dist/index.json | jq '[.[] | select(.lts != false)][0] | {version,date,lts}'
curl -fsS https://registry.npmjs.org/vite/latest | jq '{name,version,engines}'
curl -fsS https://registry.npmjs.org/@nsio%2fnsl/latest | jq '{name,version,engines}'
bun --version
node --version
npm --version
tmux -V
command -v nsl
```

Sources: [Bun stable metadata](https://registry.npmjs.org/bun/latest), [Bun 1.4.2 release](https://bun.sh/blog/bun-v1.4.2), [Bun installation](https://bun.sh/docs/installation), [Node release index](https://nodejs.org/dist/index.json), [Vite metadata](https://registry.npmjs.org/vite/latest), [Vite requirements](https://vite.dev/guide/), and [nsl metadata](https://registry.npmjs.org/@nsio%2fnsl/latest).

Node is deliberately pinned to the latest LTS line rather than the newer current line to keep development tooling on the maintained LTS baseline and match the inspected environment. This is a compatibility choice, not a claim that Node 26 is unsupported. Review the Node pin by 2026-12-01, or sooner if a verified dependency requires a change. Recheck all stable tags, peer ranges and official APIs when adding dependencies; never turn these observations into unverified future pins.

The bootstrap manifest contains no application dependencies or scripts. STACK-001 must provision the pinned Bun within the project and verify its version, installation, type checks, lint, tests and builds before asserting compatibility. Do not silently change system tools. Preserve separate root and `web/` lockfiles once introduced.

## Scope choices

- Store diagrams directly in the configured project root. No database, ORM, storage driver, migrations or database commands are needed. This is a user requirement rather than a temporary removal of functionality.
- Use one root Bun API and one sibling `web/` package without workspaces. Use plain Hono and Zod for the small API; generated API explorers are unnecessary for the MVP.
- Development routing may depend on project-local nsl; production must not. Default application binding is loopback, including local development unless a specifically reviewed routing need requires otherwise.
- Keep UI state local where possible; TanStack Query owns server snapshots. A separate global UI store is optional when real state-sharing warrants it. English is the sole MVP locale, so no translation service is required.
- Prefer a sourced shadcn textarea over a heavyweight code editor for the initial source panel. No custom primitive is approved by this decision; follow the existing component, registry, then Base UI wrapper order before proposing one.
- All rights reserved is the repository license default. No prior license or permission to grant public reuse was found. Do not publish under an open-source license without an explicit owner decision.

**2026-09-11 addendum:** in [PLAN-015](../plan/PLAN-015.md), the project owner authorized explorer file management inside the configured root: creating, renaming or moving and deleting files, and creating, renaming or moving and deleting empty folders. This replaces the MVP exclusion of file creation, rename and delete controls. Uploads, downloads, recursive deletion and a trash remain out of scope.

Review these scope choices at final MVP delivery and by 2026-12-01 if development continues. That review does not expire the user's no-database requirement or automatically authorize new features, a different UI ecosystem, public access, or relicensing.

## Security assumptions

The configured project root is selected by a trusted operator and served by one process. Do not expose arbitrary server paths or accept root changes over HTTP. Normal external editors may change project contents; service save conflict checks and bounded revision reconciliation must handle those changes without silently replacing a dirty browser draft. Arbitrary hostile operating-system users and uncooperative external writers cannot be fully isolated with a process-local save lock or path-string validation; document tested limits and use OS access controls where needed. See [PLAN-001](../plan/PLAN-001.md) for mandatory containment and concurrency checks.

## Design provenance

There is no approved prototype. The restrained system-font/monospace layout, accent and responsive choices are implementation assumptions under existing authorization. DESIGN-001 must read the full design methodology and record self-contained artifacts with `needs-review` metadata. The required UI component stack does not itself constitute an imported packaged design-system manifest.

## Stack refinement

The verified toolchain and explicit token/session/polling contracts are recorded in [Stack compatibility and contracts](2026-09-07-stack-compatibility.md). That decision supersedes the preliminary bootstrap authentication and notification proposals while retaining the original scope and authorization.
