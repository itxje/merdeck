# CI verification modes and concurrent artifact acceptance

Date: 2026-10-01. Status: accepted and verified for taskist #49.

The owner requested CI optimization after v0.19.17. Each main and tag workflow previously repeated full native acceptance; within each run the executable and published bundle browser suites ran sequentially. Publishing documentation triggered another full main run.

## Verification modes

The required verification result remains present for every workflow. A separate dependency-free classifier reads the push event's complete before/after range or a PR's merge-base-to-head range. Git NUL-delimited names and disabled rename detection retain unusual filenames and both rename endpoints. A new branch compares with the empty tree. Invalid or unavailable change metadata fails verification rather than guessing a documentation-only result.

Only `docs/`, `README.md` and `LICENSE` are documentation paths. Documentation-only changes run `git diff --check` without application dependency or browser installation. Other paths select source verification, including workflow, lock, toolchain and example changes. Main and PR source verification retains all native storage, source, coverage, build, physical directory adapter and release unit checks, but omits application artifact builds and browser smoke acceptance. Evidence explicitly marks native artifact acceptance pending.

Version tags, manual dispatch and the dedicated `verify/native-readiness` branch always select the complete normal `check:ci --native` gate. Source-only options are forbidden for real release tags. A reviewed commit with passing source checks may be tagged; the tag run establishes exact-commit Linux x64/ext4 and final artifact acceptance before publication. A duplicate full main run is unnecessary.

## Artifact execution and publication

The full gate builds executable and bundle outputs in separate owned staging directories. Their complete smoke suites then run concurrently with isolated services, fixture roots and Playwright output directories. Both checks are awaited, including cleanup after either failure, before artifacts are moved into publication locations. Failed checks retain failure status and cannot publish.

Package download and browser caches are separate; source-only jobs do not download Chromium. Built outputs are never reused across runs. Immutable action pins, read-only verification permissions, tag-only publishing and same-run artifact IDs remain required. The publisher rejects an absent artifact ID before download. Local ARM64/overlay checks remain preparation evidence; actual Linux x64/ext4 with separate refusal storage is required for native acceptance.

## Acceptance

[The exact source run](https://github.com/itxje/merdeck/actions/runs/36816553914) passed in 2m44s. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36816991054) passed complete normal Linux x64/ext4 native acceptance with distinct tmpfs refusal storage and published on attempt 1. Downloaded sanitized records confirm twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters, both complete artifact browser suites and cleanup. Native acceptance is explicitly passed. The verification job took 8m51s, compared with v0.19.17's 13m08s; the complete tag workflow took 9m19s. The final tag supplies the full native proof without a duplicate pre-tag native run.

[The release record](../task/20261001-0435-release-v0.19.18.md) confirms public checksums and build identity. Earlier failed native and density acceptance records were retained; their corrections preserved existing browser assertions.
