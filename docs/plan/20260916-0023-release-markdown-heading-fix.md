# 20260916-0023-release-markdown-heading-fix Release the Markdown heading fix

- **status**: completed
- **createdAt**: 2026-09-16 00:23
- **approvedAt**: 2026-09-16 00:23 UTC
- **relatedTask**: 20260916-0023-release-markdown-heading-fix

## Context

Release `v0.12.0` points to `e20b6b05f7c9bcfbf44c955999669e379514119b` and passed both the main-branch and tag-triggered hosted Linux x64/ext4 workflows. The new correction restores explicit `h1` through `h6` typography after Tailwind's base reset caused Markdown headings to inherit body size and weight. It changes no API, dependency, persistence, security or deployment contract, so the documented pre-1.0 version policy selects patch release `v0.12.1`.

The production Chromium regression first failed against the old CSS and then passed against the correction while retaining the document security, navigation, responsive, theme and byte-preservation assertions. The complete local `bun run check` passed 258 backend and 528 frontend tests, lint/typecheck/coverage/build, with only the established sanitized-SVG warning; incremental review found no CRITICAL/HIGH findings.

## Proposal

1. Commit the heading correction, browser regression and its release tracking without the separate unapproved HTML-document proposal.
2. Push the exact candidate to `main` and require the hosted Linux x64/ext4 native workflow to pass for that SHA.
3. Create and push annotated tag `v0.12.1` only at the verified candidate.
4. Require the tag workflow to repeat native verification and publish a non-draft, non-prerelease release containing exactly `merdeck.tar.gz` and `SHA256SUMS`.
5. Download both assets, verify the checksum, inspect the extracted bundle's version/commit identity, record the evidence, and push only that follow-up documentation commit.

## Risks

- The release tag is immutable and must not be created before the exact main candidate passes hosted native verification.
- The local checkout also contains a draft HTML-document proposal. Selective staging must keep those files and index entries out of the patch release without discarding them.
- A hosted failure stops publication. The tag is not moved and an existing release is not mutated; any correction requires a new candidate.

## Scope

Included: the reviewed Markdown heading CSS/test correction, patch version `v0.12.1`, hosted main/tag verification, published bundle/checksum verification and evidence records.

Excluded: HTML document implementation or proposal publication, deployment/restart of a hosted service, dependencies, API changes, additional visual changes and release-automation changes.

## Alternatives

- Delay publication and leave the correction unavailable to release consumers. Rejected by the owner's standing release instruction.
- Fold HTML support into the same release. Rejected because that plan is unapproved and no HTML implementation exists.

## Annotations

- The owner's 2026-09-15 instruction that subsequent completed fixes receive release tags authorizes this bounded patch-release workflow.
- Closed (2026-09-23): tag `v0.12.1` at candidate `d9c66ab4494bbf2bfbf2098be064331532883731` passed its tag workflow ([run 35040611535](https://github.com/itxje/merdeck/actions/runs/35040611535)), and the non-draft release was published on 2026-09-16 00:44 UTC with exactly `merdeck.tar.gz` and `SHA256SUMS`.
