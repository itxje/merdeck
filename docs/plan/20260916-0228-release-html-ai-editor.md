# 20260916-0228-release-html-ai-editor Release HTML documents and the AI file editor

- **status**: implementing
- **createdAt**: 2026-09-16 02:28
- **approvedAt**: 2026-09-16 02:28 UTC
- **relatedTask**: 20260916-0228-release-html-ai-editor

## Context

The reviewed candidate adds the public read-only HTML document kind, the opt-in direct AI file editor with engine/model selection, and complete document-table header frames. `v0.12.1` is the latest published release. The HTML file kind and authenticated agent API widen the public contract, so the documented pre-1.0 policy selects `v0.13.0` rather than a patch release. The feature tasks remain in progress until the exact integrated candidate passes the required hosted Linux x64/ext4 native gate.

The repository tag workflow repeats native source, executable, bundle and browser verification before publication. A successful tag run publishes only `merdeck.tar.gz` and `SHA256SUMS`; it does not deploy or restart a separately hosted service.

## Proposal

1. Review and commit only the approved HTML, AI editor, engine/model UI, table-frame and tracking changes, preserving unrelated worktree changes.
2. Run frozen installs and the complete normal `check:ci` gate from an independent clean worktree at the exact candidate commit. Retain the separate enabled-provider production-browser evidence because the provider-independent release bundle intentionally has no configured CLI.
3. Push the reviewed candidate to `main` and require the exact commit to pass the hosted Linux x64/ext4 native workflow. Do not create a tag after a failed or cancelled run.
4. Complete the three blocking implementation records only after that exact hosted acceptance, then create and push annotated tag `v0.13.0` at the verified candidate. The tag must never be moved.
5. Require the tag workflow to repeat native verification and publish a non-draft, non-prerelease release containing exactly the two documented assets. Download both, verify `SHA256SUMS`, inspect extracted bundle version/commit identity, and record immutable evidence in a later documentation-only commit.

## Risks

- A version tag is immutable. It is created only after exact-commit hosted acceptance and is never repointed after failure.
- Provider-enabled browser acceptance needs a deterministic explicitly configured fake CLI; the published bundle remains provider-independent and starts with AI disabled.
- Direct provider writes remain external-actor writes and release acceptance does not convert them into Merdeck save transactions.
- A published release does not update the user's currently running service. Deployment, restart and local provider-path configuration remain separate operator actions.
- Post-publication evidence necessarily follows the tagged commit; it must not be misrepresented as part of the tested artifact.

## Scope

Included: the approved HTML renderer, AI file editor and model selection, table-header frame correction, exact local and hosted gates, annotated `v0.13.0` tag, release assets and immutable evidence tracking. Excluded: service deployment/restart, provider account setup, API-key management, HTML editing, additional agent tools, persistent conversations, release-workflow changes and unrelated worktree files.

## Alternatives

- A patch release would understate the public HTML and agent API additions.
- Publishing before hosted native acceptance would bypass the repository's release contract.
- Bundling or auto-discovering provider executables would weaken the explicit operator trust boundary and is not part of this release.

## Annotations

- 2026-09-16: The owner approved the direct-editing and read-only HTML proposals, required engine/model selection and requested publication after completion.
- 2026-09-16: The owner separately requested complete table-header frames; that bounded repair is included in the same minor release.
