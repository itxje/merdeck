# CI verification and single-executable distribution

Date: 2026-09-07. Status: authorized implementation; actual hosted native/x64 acceptance remains pending. Original CI/repository authorization and executable clarification were both supplied on this date; no later approval is inferred.

## Distribution

Keep the sibling React/Vite frontend and Bun/Hono backend. Build Vite first, load only its validated trusted output, and snapshot each resource into ignored generated compile inputs. Explicit `with { type: "file" }` imports embed these bytes in Bun's internal executable filesystem. A generated entry injects the exact public-path/MIME map into the existing Hono static boundary. This includes every emitted lazy chunk/font/image, independently of whether a particular smoke page requests it. No tracked stub is swapped, and no asset is extracted at runtime. Incoming requests remain exact map lookups; configured project files are never static assets.

Source `build` still produces development/deployment source outputs. `compile --tag ... --target ...` produces one executable with the runtime and frontend embedded, plus internal manifest metadata. `--version` and `--build-info` require no credentials. Compile-time metadata derives only from a validated tag and actual commit. Runtime `.env`/bunfig autoload is disabled in the executable; exported configuration stays user-owned. Source Bun startup retains its existing `.env` behavior. The first project version is unchosen; `v0.0.0-ci.fixture` is exclusively a nonpublishing fixture, never a tag or release.

Public release attachments are the raw version/platform-named executable and SHA256SUMS. Internal manifest.json accompanies the checked workflow artifact but is not a public asset. No archive or fallback package requiring installed Bun/separate frontend resources is produced. Linux x64 is the required initial release target; local arm64 checks are separate preparation evidence. Both use Linux/glibc targets, and the existing Linux/procfs and actual storage admission requirements remain. Other operating systems, x64 execution without matching-runner evidence and blanket Linux filesystem support are not advertised.

## Verified official APIs and immutable action pins

The current supported releases below were obtained from each official repository's releases/latest endpoint. Each version tag was resolved using its commits/{tag} endpoint; action.yml and README were then inspected at that exact SHA on 2026-09-07. All selected JavaScript actions use the supported Node 24 action runtime. Repository development runtimes remain Bun 1.4.2 and Node 24.20.0.

| Action | Release | Verified commit |
| --- | --- | --- |
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | v7.0.0 | 820762786026740c76f36085b0efc47a31fe5020 |
| oven-sh/setup-bun | v2.2.0 | 0c5077e51419868618aeaa5fe8019c62421857d6 |
| actions/cache | v6.1.0 | 55cc8345863c7cc4c66a329aec7e433d2d1c52a9 |
| actions/upload-artifact | v7.0.1 | 043fb46d1a93c77aae656e7c1c64a875d1fc6a0a |
| actions/download-artifact | v8.0.1 | 3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c |

Official sources: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.0.0), [setup-bun](https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0), [cache](https://github.com/actions/cache/releases/tag/v6.1.0), [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.1), [download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.1).

[actionlint v1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12) is the current official release. The official release API provides these archive SHA-256 digests, pinned in scripts/ci/tools.ts: Linux amd64 `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`, Linux arm64 `325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6`. Setup verifies archive bytes before extracting only the tool into .cache/actionlint/1.7.12 and checks its reported version. No global installation occurs locally.

Root automation adds @playwright/test 1.63.0, matching the sibling's existing exact pin. [Official npm metadata](https://registry.npmjs.org/@playwright%2ftest/latest) was rechecked before addition: current stable 1.63.0, Node >=20. This permits typed root-owned executable verification without importing through web/node_modules or changing the frontend package. Root lock changes only for that verification dependency; existing application versions and the web lock remain intact.

[Bun executable documentation](https://bun.sh/docs/bundler/executables) establishes explicit linux-x64/linux-arm64 targets, file import attributes, internal asset reads, standalone detection and deterministic compile autoload flags. [Workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) establish PR/push/tag filters and default-branch availability requirements for workflow_dispatch. [Secure use](https://docs.github.com/en/actions/reference/security/secure-use) supports immutable action references, narrow permissions and safe event input handling. [Release API](https://docs.github.com/en/rest/releases/releases), [asset API](https://docs.github.com/en/rest/releases/assets), [Git reference API](https://docs.github.com/en/rest/git/refs) and [API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions) were checked before implementing draft publication, asset digest verification and tag peeling. The current API version is 2026-03-10.

## Check and publication boundaries

One workflow runs PR/main plus the explicit nonpublishing `verify/native-readiness` branch and manual events. Since an initially empty repository cannot rely on a workflow_dispatch file on the default branch, the candidate branch push is the first usable entry. No branch event publishes. Actual workspace/ext4 and separate /dev/shm refusal storage are identified through held descriptor mount/statfs metadata; no mounts or admission overrides are created. PLAN-005's current ext4 policy refusal is a visible failed check after the raw evidence, not a tolerated success.

The check job installs frozen root/web dependencies and browser prerequisites, tmux, strace and project-local verified actionlint. Cache keys include both locks and runtime pins; only package downloads and browser binaries are cached. All gate subprocesses/services run in the prescribed persistent project tmux session. Local check:ci runs file/storage/source/workflow/release gates once and delegates its one complete browser suite through binary smoke. Native mode uses check:storage's file/HTTP stages without duplicating them. No skipped/no-tests/always-green stage certifies admission. Failure exports only bounded redacted synthetic textual evidence; private configurations, tokens, raw process traces, browser traces/video and arbitrary project files are excluded.

Only a version-tag push whose check job succeeds can invoke publication. The publisher receives contents:write; all other work defaults to read. It restores no writable cache, disables checkout credential persistence and installs frozen publisher dependencies without lifecycle scripts. It consumes the exact checked artifact ID from this run, revalidates inventory/version/checksum/commit and resolves the actual remote tag. Authenticated release listing includes resumable drafts. A matching provenance marker binds expected attachment digests; unrelated/duplicate/mismatched releases or assets cause safe failure. Missing draft attachments upload before final publication; a completed matching release is reused without mutation. No delete/replace API exists. A partial published release fails rather than silently repairing it. Local mock transport tests never contact the remote repository.

## Remaining acceptance

Native ext4 admission is not changed here. The initial real hosted run must retain exact commit/run/runner/filesystem identity and twenty raw results, then fail the current policy. That evidence can support a separately reviewed bounded admission correction; subsequent native source and binary browser gates must actually pass before publication or delivery readiness. Current local overlay proof, workflow syntax and cross-compilation cannot substitute for this gate. Direct external edits, known-stale conflicts, dirty drafts, final comparison/rename loss window and local OS-actor limits remain unchanged; applicationSafetyPassed=false stays diagnostic. All rights reserved and needs-review design status are preserved.

## Addendum 2026-09-12: stable release archive

At the owner's request, the public attachments are now `merdeck.tar.gz` and SHA256SUMS instead of the version-named executable, so that one address keeps working across releases. The archive is a reproducible gzip-compressed tar holding exactly one standalone executable named `merdeck`, written with fixed metadata and without a stored name or timestamp, so identical builds produce identical archive bytes. It still requires no installed runtime and no separate frontend resources, and the version-named executable remains a checked build output and workflow artifact. This supersedes the "no archive or fallback package" sentence above for packaging only. The release checks read the archive back and compare it with the checked executable, and the smoke runs the extracted executable under the tracer. See [PLAN-018](../plan/PLAN-018.md).
