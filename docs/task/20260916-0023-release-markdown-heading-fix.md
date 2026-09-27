# 20260916-0023-release-markdown-heading-fix Release the Markdown heading fix

- **status**: completed
- **priority**: P1
- **owner**: release-maintainer/20260916-0023
- **createdAt**: 2026-09-16 00:23

## Description

Publish the reviewed Markdown heading hierarchy correction as patch release `v0.12.1`. Acceptance: commit only the approved fix and its tracking, push the exact candidate to `main`, require its hosted Linux x64/ext4 native workflow to pass, create an annotated tag at that verified commit, require the tag workflow to publish exactly `merdeck.tar.gz` and `SHA256SUMS`, verify the downloaded checksum and bundle identity, and record the immutable release evidence.

## ActiveForm

Releasing the Markdown heading hierarchy correction.

## Dependencies

- **blocked by**: 20260916-0018-markdown-heading-hierarchy
- **blocks**: (none)

## Notes

- Authorization: the owner directed on 2026-09-15 that subsequent completed fixes be released with tags. The current correction is an ordinary patch under the documented pre-1.0 release policy.
- Investigation (2026-09-16): `v0.12.0` is the latest release and exact `main` head `e20b6b0` passed both main and tag native workflows. The heading correction changes only document CSS and its browser regression; local focused production Chromium and the complete repository check pass.
- Candidate (2026-09-16): commit `d9c66ab4494bbf2bfbf2098be064331532883731` was pushed to `main`. Hosted Linux x64/ext4 verification is [run 35039888551](https://github.com/itxje/merdeck/actions/runs/35039888551); tag creation remains blocked until that exact run succeeds.
- Closed (2026-09-23): tag `v0.12.1` at candidate `d9c66ab4494bbf2bfbf2098be064331532883731` passed its tag workflow ([run 35040611535](https://github.com/itxje/merdeck/actions/runs/35040611535)), and the non-draft release was published on 2026-09-16 00:44 UTC with exactly `merdeck.tar.gz` and `SHA256SUMS`.
