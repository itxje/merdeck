# 20260915-0903-release-markdown-and-p2-repairs Release Markdown documents and P2 repairs

- **status**: completed
- **priority**: P1
- **owner**: release-maintainer/20260915-0903
- **createdAt**: 2026-09-15 09:03

## Description

Publish the reviewed whole-Markdown renderer, directory-poll save-race guard, source-pane browser ordering repair, and encoded angle-placeholder repair as a minor release. Acceptance: a clean candidate containing the reviewed committed work and release tracking is pushed to `main`; its exact commit passes hosted Linux x64/native verification; an annotated `v0.12.0` tag resolves to that commit; the tag workflow publishes a non-draft, non-prerelease release with `merdeck.tar.gz` and `SHA256SUMS`; and independently verified release evidence is committed and pushed afterward.

## ActiveForm

Releasing whole Markdown documents and the integrated P2 repairs.

## Dependencies

- **blocked by**: reviewed integration of 20260913-2142-markdown-document, 20260914-1150-directory-poll-save-race, 20260914-1559-source-pane-e2e-ordering, and 20260915-0516-encoded-angle-placeholder
- **blocks**: (none)

## Notes

- Authorization (2026-09-15): the owner explicitly directed that completed fixes receive release tags and requested release delivery after these repairs.
- Investigation (2026-09-15): `v0.11.4` is the latest published release and resolves to `ebebccdb384e8ddc04df720ba8a37d67a79c2354`. Local `main` contains the four reviewed committed repairs at merge commit `16169fed3192bc9b16eea18486ce45ebacc9c795`, is clean before release tracking, and is 28 commits ahead of `origin/main`. `v0.12.0` is absent locally and remotely. Returning complete Markdown text changes the API contract, so the documented pre-1.0 version rule requires the next minor version. The release workflow repeats full Linux x64/ext4 source, executable, bundle, and browser acceptance before publication.
- Proposal (2026-09-15): record the release candidate without changing product behavior or release automation; run the complete clean local gate; push the candidate to `main`; require successful hosted native verification for that exact commit; create and push annotated tag `v0.12.0` only after that pass; require the tag workflow to repeat verification and publish the two expected assets; download and verify their checksum and bundle identity; then complete the feature/release tracking and push immutable evidence in a follow-up documentation commit.
- Closed (2026-09-23): tag `v0.12.0` at `e20b6b05f7c9bcfbf44c955999669e379514119b` passed its tag workflow ([run 35008093035](https://github.com/itxje/merdeck/actions/runs/35008093035)), and the non-draft release was published on 2026-09-15 18:39 UTC with exactly `merdeck.tar.gz` and `SHA256SUMS`. Later releases superseded it; the record had not been closed.
