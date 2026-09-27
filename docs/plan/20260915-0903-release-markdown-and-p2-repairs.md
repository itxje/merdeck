# 20260915-0903-release-markdown-and-p2-repairs Release Markdown documents and P2 repairs

- **status**: completed
- **createdAt**: 2026-09-15 09:03
- **approvedAt**: 2026-09-15 09:03 UTC
- **relatedTask**: 20260915-0903-release-markdown-and-p2-repairs

## Context

The reviewed candidate integrates complete Markdown document rendering, a synchronous directory-poll pause guard around saves, deterministic source-pane activation, and a narrow inert-text restoration for encoded lowercase angle placeholders. Focused unit, coverage, build, security-boundary, exact-byte, production-browser, and performance checks passed on the committed worker branches; each branch passed implementation review without Critical or High findings and was merged without conflict. The exact integrated candidate still requires the repository's clean aggregate and hosted Linux x64/ext4 release gates.

`v0.11.4` is the latest published release. Returning exact BOM-free Markdown text in the document and save responses changes the API contract, so the documented pre-1.0 version policy selects `v0.12.0`. The immutable tag is created only after the exact pushed `main` candidate passes hosted native verification; the tag workflow repeats that verification before publishing `merdeck.tar.gz` and `SHA256SUMS`.

## Proposal

1. Commit only the release tracking and already verified `v0.11.4` evidence on top of the reviewed integrated repairs; do not change application behavior, dependencies, or release automation.
2. Run the complete local frozen-install and `check:ci` gate from a clean candidate, then push it to `main` and require successful hosted Linux x64/native verification for the exact commit.
3. Validate and create annotated tag `v0.12.0` at that verified commit, then push only that tag.
4. Require the tag workflow to repeat verification and publish a non-draft, non-prerelease release containing exactly `merdeck.tar.gz` and `SHA256SUMS`.
5. Download the published assets, verify `SHA256SUMS`, inspect the extracted bundle identity, complete the Markdown and release records, update current-release documentation, and push the evidence-only follow-up commit.

## Risks

- A version tag is immutable, so it must only be created after the exact candidate passes hosted verification.
- The new Markdown response field and client parser increase payload, memory, and frontend bundle size; their limits, Worker path, fallback behavior, strict link/resource policy, and measured evidence must remain covered by the aggregate.
- If either hosted workflow fails, the tag must not be moved and a published release must not be mutated; inspect the exact failed stage before a bounded retry or corrective commit.
- The tag intentionally excludes the post-publication evidence record, which is committed only after the published artifacts have been independently verified.

## Scope

Included: the four reviewed integrated repairs, one `v0.12.0` minor release, exact native/release verification, and evidence tracking. Excluded: deployment or service restart, further product behavior, dependency promotion, security-policy expansion, release-automation changes, and unrelated files.

## Alternatives

A patch release would contradict the documented policy for an API-contract change. Delaying publication would leave the repaired Mermaid and Markdown behavior unavailable to release consumers.

## Annotations

- The owner explicitly directed on 2026-09-15 that completed repairs be tagged and released. This approval applies to the proposal above.
- Approval recorded 2026-09-15 09:03 UTC; release execution may proceed within the stated scope.
- Closed (2026-09-23): tag `v0.12.0` at `e20b6b05f7c9bcfbf44c955999669e379514119b` passed its tag workflow ([run 35008093035](https://github.com/itxje/merdeck/actions/runs/35008093035)), and the non-draft release was published on 2026-09-15 18:39 UTC with exactly `merdeck.tar.gz` and `SHA256SUMS`. Later releases superseded it; the record had not been closed.
