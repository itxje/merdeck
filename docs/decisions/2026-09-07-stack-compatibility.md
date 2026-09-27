# Stack compatibility and boundary contracts

Date: 2026-09-07. Status: adopted within the original authorized scope; scaffold verification is recorded in STACK-001. The prototype remains needs-review.

## Registry and runtime evidence

Every direct dependency was checked against `https://registry.npmjs.org/<encoded-package>/latest` before installation; exact versions are pinned in both manifests and both Bun lockfiles. The table records the installed choices. Runtime and peer ranges were inspected alongside the stable tags. Bun 1.4.2 is the declared runtime; the project-local executable is `.cache/runtime/bun-1.4.2/bun` (Linux aarch64), provisioned from the official `@oven/bun-linux-aarch64` 1.4.2 tarball after checking its SHA-512 registry integrity. `bun --version` reports 1.4.2. System Bun 1.3.12 was preserved. Node reports v24.20.0; npm reports 11.19.0; tmux reports 3.5a.

| Manifest | Dependency | Exact pin |
| --- | --- | --- |
| `package.json` | `hono` | 4.13.7 |
| `package.json` | `zod` | 4.5.4 |
| `package.json` | `@antfu/eslint-config` | 9.5.1 |
| `package.json` | `@nsio/nsl` | 0.1.7 |
| `package.json` | `@types/bun` | 1.4.1 |
| `package.json` | `eslint` | 10.10.0 |
| `package.json` | `jiti` | 2.7.0 |
| `package.json` | `typescript` | 6.0.3 |
| `web/package.json` | `@base-ui/react` | 1.8.0 |
| `web/package.json` | `@tanstack/react-query` | 5.102.8 |
| `web/package.json` | `@tanstack/react-router` | 1.170.33 |
| `web/package.json` | `class-variance-authority` | 0.7.1 |
| `web/package.json` | `cn` | 0.2.6 |
| `web/package.json` | `dompurify` | 3.4.15 |
| `web/package.json` | `lucide-react` | 1.42.0 |
| `web/package.json` | `mermaid` | 11.17.2 |
| `web/package.json` | `react` | 19.2.8 |
| `web/package.json` | `react-dom` | 19.2.8 |
| `web/package.json` | `shadcn` | 4.21.0 |
| `web/package.json` | `tw-animate-css` | 1.4.0 |
| `web/package.json` | `@antfu/eslint-config` | 9.5.1 |
| `web/package.json` | `@eslint-react/eslint-plugin` | 5.19.0 |
| `web/package.json` | `@playwright/test` | 1.63.0 |
| `web/package.json` | `@tailwindcss/vite` | 4.3.3 |
| `web/package.json` | `@tanstack/router-plugin` | 1.168.36 |
| `web/package.json` | `@testing-library/dom` | 10.4.1 |
| `web/package.json` | `@testing-library/jest-dom` | 7.0.1 |
| `web/package.json` | `@testing-library/react` | 16.3.3 |
| `web/package.json` | `@testing-library/user-event` | 14.6.7 |
| `web/package.json` | `@types/node` | 26.5.0 |
| `web/package.json` | `@types/react` | 19.2.18 |
| `web/package.json` | `@types/react-dom` | 19.2.7 |
| `web/package.json` | `@vitejs/plugin-react` | 6.1.1 |
| `web/package.json` | `@vitest/coverage-v8` | 5.0.0 |
| `web/package.json` | `eslint` | 10.10.0 |
| `web/package.json` | `eslint-plugin-jsx-a11y` | 6.10.2 |
| `web/package.json` | `eslint-plugin-react-refresh` | 0.5.6 |
| `web/package.json` | `jiti` | 2.7.0 |
| `web/package.json` | `jsdom` | 30.0.1 |
| `web/package.json` | `tailwindcss` | 4.3.3 |
| `web/package.json` | `typescript` | 6.0.3 |
| `web/package.json` | `vite` | 8.2.2 |
| `web/package.json` | `vitest` | 5.0.0 |

TypeScript is the sole non-latest direct application/tooling pin: the stable tag was 7.0.2, but installed typescript-eslint 8.69.0 rejects its unavailable legacy API and publishes `>=4.8.4 <6.1.0`. Both packages use the newest stable 6.0 patch, 6.0.3, verified from registry version metadata. This avoids maintaining two compilers for a small project. Revisit when typescript-eslint supports the 7.x API, or by 2026-12-01. Node 24.20.0 remains the bootstrap's deliberate current-LTS pin rather than Node 26 current. Vite 8.2.2/plugin-react 6.1.1, React 19.2.8/Base UI 1.8.0, TanStack Router/plugin, Vitest 5.0.0/coverage-v8 5.0.0 and jsdom 30.0.1 publish compatible peers and engines for this Node version. Vitest 5 is the current stable major despite older skill examples using 4.

Registry sources: [Bun](https://registry.npmjs.org/bun/latest), [TypeScript versions](https://registry.npmjs.org/typescript), [Hono](https://registry.npmjs.org/hono/latest), [Zod](https://registry.npmjs.org/zod/latest), [Vite](https://registry.npmjs.org/vite/latest), [React](https://registry.npmjs.org/react/latest), [Base UI](https://registry.npmjs.org/@base-ui%2freact/latest), [shadcn](https://registry.npmjs.org/shadcn/latest), [Vitest](https://registry.npmjs.org/vitest/latest), [nsl](https://registry.npmjs.org/@nsio%2fnsl/latest). The same endpoint form was used for every table entry; metadata evidence remains in ignored `tmp/registry/packages.json` in the verification checkout.

Official APIs reviewed: [Hono Bun and request tests](https://hono.dev/docs/getting-started/bun), [Zod strict objects and coercion](https://zod.dev/api), [Bun test discovery](https://bun.com/docs/test/configuration), [TypeScript 7 compiler API transition](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [TanStack Vite integration](https://tanstack.com/router/latest/docs/installation/with-vite), [Query provider](https://tanstack.com/query/latest/docs/framework/react/quick-start), [Vite shared options](https://vite.dev/config/shared-options), [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [React context](https://react.dev/reference/react/useContext), [Vitest coverage](https://vitest.dev/guide/coverage.html), [Mermaid settings](https://mermaid.js.org/config/schema-docs/config.html), and [DOMPurify SVG sanitization](https://github.com/cure53/DOMPurify). nsl's installed README and command help were inspected for the actual launch/get/strip/NSL_PORT APIs.

## Component provenance and assumptions

There were no existing components. Official shadcn 4.21.0 produced the primitives, using Base UI, base-nova, neutral and CSS variables. Its current CLI accepts `--base base --preset nova`; `--preset base-nova` is rejected even though help still mentions it. The verified initialization command was:

```bash
bun run --cwd web shadcn init --template vite --base base --preset nova --no-monorepo --css-variables --yes --force --no-reinstall
```

Initialization generated button and utility files. They were moved into the specified `src/shared/` folders and aliases updated before adding the remaining primitives:

```bash
bun run --cwd web shadcn add input textarea select tabs dialog alert tooltip dropdown-menu separator --yes
```

`components.json` uses the CLI's actual schema: `style: base-nova` selects Base UI and emitted components import `@base-ui/react/*`; the CLI has no separate `componentLibrary` key. No Radix or alternative primitive ecosystem is introduced. Generated files are owned code. Normalizations: project lint formatting, moving the dialog overlay color into the semantic CSS token layer, and replacing the optional generated font dependency with system fonts. The current CLI uses `cn` 0.2.6; redundant direct clsx/tailwind-merge dependencies were removed. No custom primitive was needed. ThemeToggle is a composed sourced Button. Selected export names are allowed by Fast Refresh lint for route factories, theme hook and CLI variant helpers.

Neutral surfaces, system controls, monospace source typography in the later editor and compact layout are assumptions. All actual colors are in `web/src/index.css`; light/dark declarations map through `@theme inline`. Generated chart/sidebar token defaults are retained for consistent future sourcing. No prototype approval is asserted.

## Contracts and intentional deviations

The canonical root key is DIAGRAMDOCK_ROOT. Mandatory startup token, bounded in-memory cookie sessions and CSRF/Origin validation replace the preliminary optional-loopback/header-stream proposal. Bounded tree/content polling replaces watchers/streams. `src/modules/diagrams/` owns the future file domain. `src/shared/contracts.ts` defines the exact request/response/error/selector/version/session types; frontend imports only types. See [architecture](../architecture.md) for endpoint, byte-span identity, error and refresh semantics.

**2026-09-11 addendum:** in [PLAN-016](../plan/PLAN-016.md), the project owner made the access token optional. Without it the service runs with open access, which startup accepts only for loopback-only services unless `MERDECK_OPEN_ACCESS=true` deliberately allows wider exposure. With a token, sessions, CSRF protection and logout are unchanged. This supersedes the mandatory startup token above; Host, Origin and fetch metadata validation remain mandatory in both modes.

There is no database, workspace, standalone compiled binary, container, runtime Vite integration, production nsl dependency, translation service or global UI store. These are deliberate scope choices. Build output is normal Bun code plus Vite assets; production asset routing is a later task. Route generation happens in Vite development and the generated tree is committed; production builds disable generation to avoid source changes. Coverage gates target at least 80% of implemented boundaries; generated primitives, wiring and the unimplemented domain are not represented as application acceptance coverage. Playwright is installed for later critical flows, but no placeholder E2E test or pass-with-no-tests flag is used.
