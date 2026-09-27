# 20260926-1626-html-embedded-diagram-images Render bounded embedded diagram images in HTML previews

- **status**: completed
- **createdAt**: 2026-09-26 16:26
- **approvedAt**: 2026-09-26 16:29
- **relatedTask**: 20260926-1626-html-embedded-diagram-images

## Context

`html-worker.ts` calls `projectHtml`; its `safeMediaSrc` helper applies `maxUrlCharacters = 2048` before admitting Base64 data URLs. `HtmlDocumentView` receives image nodes without `src`. Both affected documents embed valid Mermaid SVG exports, much larger than 2048 characters. They render in a standalone browser but fail in the actual viewer.

The current HTML reader only extracts a top-level `nav`. The two documents have already been corrected to provide that structure. Their styles have also been made compatible with the current style projection. Neither HTML script execution nor runtime Mermaid parsing is needed to display their existing exports.

## Proposal

1. Add a separate, bounded allowance of 1,048,576 URL characters for Base64 `data:image/...` sources on `img` elements. Keep the existing 2048-character limit for ordinary links, network URLs and other media. Preserve scheme and control-character checks, script removal, SVG-as-image isolation and CSP.
2. Add RED-first unit tests for a realistic SVG data URL above 2048 characters, both size boundaries, oversized ordinary links and disallowed schemes. Then implement the smallest passing change in the existing HTML projection module.
3. Add a browser regression with a real large SVG data image and top-level navigation. Check successful image decoding and dimensions, sidebar position, narrow layout, and absence of script execution or unexpected requests.
4. Load the actual SDCR200 and KM2210 pages through the current Merdeck HTML reader and inspect all nine images and section navigation. Retain standalone HTML compatibility and update their validation record after actual-viewer checks pass.

The core change is an image-only bound, not a general URL limit increase:

```ts
// Ordinary URLs remain governed by maxUrlCharacters.
const maxInlineImageCharacters = 1024 * 1024
```

## Risks

Larger inline images increase parsing, serialization and browser decode work. Per-image admission remains bounded and the existing whole-document file limit (default 1 MiB, configurable up to 8 MiB) remains authoritative. SVG is displayed through `img`; it is not injected as executable SVG DOM. An installed service needs a release/update before it can use changed viewer code.

## Scope

- `web/src/features/document/html-policy.ts`
- `web/src/features/document/html-policy.test.ts`
- `web/src/test/e2e/html-document.spec.ts`
- Task/plan records and changelog; validation metadata for the two local HTML documents.
- No new dependency, backend route, script support, authentication change or deployment in this proposal.

## Verification

Run focused unit and browser regressions, then the repository-required `bun install --frozen-lockfile`, `bun install --cwd web --frozen-lockfile`, `bun run check:ci` and `git diff --check` with the pinned toolchain. Record local versus native-release acceptance separately. Do not claim the live service is repaired until its updated build is deployed and verified.

## Alternatives

- Browser-only viewing works with current files, but does not satisfy the confirmed Merdeck workflow.
- Remote image hosting introduces a network dependency and is unnecessary for these self-contained documents.
- Adding runtime Mermaid support to HTML would be a larger feature; existing SVG exports already provide the requested diagrams.

## Annotations

The user explicitly approved implementation and requested that the contents sidebar move higher. The sidebar adjustment is limited to the two HTML documents.

## Implementation outcome

The image-only allowance and regression coverage are implemented. Both HTML pages move the sidebar upward by 20 pixels, to the same desktop top position as the content. All nine diagrams decode through the actual local reader and in standalone HTML. Focused browser checks and the executable HTML regressions pass. The aggregate local gate is not passed: an existing Markdown file-limit case encountered directory HTTP 503, after an earlier run observed the same response in an external-deletion case. Plan/task acceptance remains open for that full-gate limitation; no unrelated directory code, live service or release was changed.

The extracted bundle subsequently passed all 94 enabled browser cases (17 configured skips), resource checks and cleanup. This includes the HTML regression and both cases that previously encountered directory HTTP 503. The aggregate command itself remains unpassed.

## Clean-source acceptance

Commit `51d9f1a5a48edd50b28ad48ca0422407b423492a` passes the complete local `check:ci`, including evidence export, 582 frontend unit cases and both 96-case browser runs (17 configured skips each). The exact commit also passes [Linux x64/ext4 native acceptance](https://github.com/itxje/merdeck/actions/runs/36258536398) on attempt 1. The native report records `sourceClean: true`, architecture `x64`, filesystem `0xef53` and successful source, bundle and compiled modes. This resolves the earlier aggregate acceptance limitation without weakening tests. Local evidence: `tmp/release-v0195-check.log`; downloaded native evidence: `tmp/release-v0195-native-reports/`.

Release publication is tracked separately in [v0.19.5](../task/20260926-1717-release-v0.19.5.md). No running service was updated.
