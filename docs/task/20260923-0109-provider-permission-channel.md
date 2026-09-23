# 20260923-0109-provider-permission-channel Restore the host permission channel as a live boundary

- **status**: in_progress
- **priority**: P2
- **owner**: l1/session-20260923
- **createdAt**: 2026-09-23 01:09

## Description

The adapter answers the provider's permission requests: it allows a path inside the project and denies
everything else, including a tool outside the allow-list, a path-taking tool with no path, and a request
arriving with no turn in flight. Measured against two provider builds, that code never runs. The provider asks
for a decision zero times, for any tool, under every argument combination tried — a different permission mode,
an extra allowed directory, and dropping the restricted flag all leave the count at zero.

Since 20260922-2055 the file tools are pre-approved at launch, so the panel works and the project boundary is
enforced by the provider confining those tools to the working directory. That is one mechanism where the
design intends two. If a later provider build changes what the restricted flag confines, the only remaining
constraint is a sentence in a system prompt, which is not a boundary.

Find out what the provider expects before it will route a decision to the host — most likely something the
initialize handshake must declare, since the argument that selects the host as the answerer is already
passed — and either make the adapter declare it, or record that the channel is gone and replace the refusal it
was carrying with one this service can enforce itself.

Acceptance: either a turn drives at least one permission request to the adapter and the existing refusals are
observed end to end, or the task records why that is impossible and leaves the boundary explicit rather than
implied.

## ActiveForm

Restoring the host permission channel.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Measured on the provider build the deployment runs and on a later one; both behave the same.
- The refusals the adapter would apply are covered by the adapter suite through a fake provider, which answers
  the channel the way the real one does not. The suite therefore passes while the real path is dead.
- The provider's own refusal, which is what holds the boundary today, reads `<path> is outside <root>;
  --restricted confines the file tools to the working directory.`
- Investigation (2026-09-23), measured on provider builds 2.1.263, 2.1.269 (the deployed one) and 2.1.280,
  which all behave the same:
  - `--permission-prompts host` only selects who would answer; it installs no host handler. The handler is
    installed by `--permission-prompt-tool stdio`, which is what the provider's own host SDK passes when a
    permission callback is set. The initialize request needs no extra field.
  - A pre-approved tool never consults the host. With `--permission-prompt-tool stdio` and the file tools
    still in `--allowedTools`, a turn raised zero requests.
  - With `stdio` and Edit/Write not pre-approved, every in-project Edit or Write raised exactly one
    `can_use_tool` request; reads, globs and greps inside the project raised none. No other control request
    type appeared.
  - An out-of-project write is refused by `--restricted` before it reaches the host. With `--restricted`
    removed as a probe, the adapter's own `The path is outside the project.` refusal fired and nothing was
    created, so that refusal works end to end once the channel is live.
  - Regression to guard against: with the channel live, writes to protected in-project files such as
    `.claude/settings.json` and `.git/hooks/pre-commit` reach the host with `decision_reason_type:
    "safetyCheck"`, and the current handler allows them because they are inside the project. Today the
    provider refuses them itself. A plain in-project edit arrives with no decision reason.
  - Driven through a patched copy of the adapter against 2.1.269 and 2.1.280: Edit and Write inside the
    project were allowed and emitted `file.changed`, the protected file was refused and not created, and the
    turn completed.
- Proposal: [20260923-0820-provider-permission-channel](../plan/20260923-0820-provider-permission-channel.md),
  awaiting approval.
