# 20260923-0109-provider-permission-channel Restore the host permission channel as a live boundary

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
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
