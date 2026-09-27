# Scoped directory contract and routing compatibility

Date: 2026-09-13. Status: adopted for implementation within the owner's existing authorization, after the full proposal was recorded. Implementation and integrated acceptance remain pending.

## Decision

Implement the new directory page, revision and cursor-close contracts through the existing plain Hono router, Zod strict schemas, shared TypeScript contracts, `queryInput`/`jsonInput`, and central safe error mapping. The authoritative endpoint names, response discriminants, limits and restart semantics are in [Directory navigation and bounded pagination](../plan/20260913-1628-directory-navigation-pagination.md). Do not maintain a second schema in this decision.

The current backend baseline ordinarily requires `@hono/zod-openapi`, generated OpenAPI and Scalar for contract endpoints. This scoped deviation continues the repository's explicit [file-only runtime and scope decision](2026-09-07-runtime-and-scope.md) and [stack compatibility decision](2026-09-07-stack-compatibility.md). A whole-backend OpenAPI migration is outside this feature's directory-browsing scope; this decision retains the existing compatibility approach. Adding a second route framework or migrating all existing contracts would enlarge the security and compatibility surface without addressing directory traversal. This is an explicit baseline exception, not a statement that plain contract routes satisfy that baseline by default.

Keep request/response/error contracts in `src/shared/contracts.ts`, strict runtime request validation at the existing HTTP edge, frontend response decoding, and focused contract tests covering both API mount modes and every completion/restart state. Do not add a validator package, hand-maintained OpenAPI document, generated explorer, database, global runtime upgrade or workspace migration. No new dependency is needed, so no new stable-version lookup or compatibility pin is proposed. Retain Bun 1.4.2, Node 24.20.0, TypeScript 6.0.3 and the existing compatibility reasons and lockfiles. Revisit routing only as a separately scoped migration with a concrete acceptance plan.

## Filesystem and lifecycle consequences

`maxTreeDepth` becomes a legacy discovery bound only; the new separately configured `maxPathDepth` bounds all direct operations and ancestor walks. The new forward-only directory stream requires bounded retained descriptors, exact expiry, invalidation and async disposal; the old service claim of requiring no disposal no longer applies after implementation. No filesystem index or content-reading directory cache is introduced.

Preserve the actual storage policy from [PLAN-020](../plan/PLAN-020.md) and its implementation correction: measured overlay/ext4 stable identity, measured virtiofs content identity, and continued refusal of unsupported storage. No environment flag selects an identity model. Root/directory identity, held mount/type/device checks, full-file revisions, original-byte saves, and the final comparison/rename and local-actor limitations remain. The new namespace fingerprint is not a file version and does not weaken these checks.

## Design and review status

The existing base-nova, Base UI, Tailwind, TanStack Router/Query and source/preview layout remain. Per-directory navigation, a bounded loaded-page window and deferred Markdown discovery are feature defaults under the owner's authorization. The prototype remains **needs-review**. Existing [PLAN-026](../plan/PLAN-026.md) and [PREVIEW-011](../task/PREVIEW-011.md) remain intact. Contract completion alone supplies no backend, browser, preview, native or release acceptance.
