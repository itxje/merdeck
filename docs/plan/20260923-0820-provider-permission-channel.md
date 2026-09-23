# 20260923-0820-provider-permission-channel Route file-write decisions through the adapter again

- **status**: draft
- **createdAt**: 2026-09-23 08:20
- **relatedTask**: 20260923-0109-provider-permission-channel

## Context

The Claude Code adapter answers permission requests with an in-project allow and an out-of-project refusal,
but the provider never sends one. The adapter launches with `--permission-prompts host`, which only chooses
who would answer; the handler itself is installed by `--permission-prompt-tool stdio`, which the adapter never
passes. Since 20260922-2055 Edit and Write are also pre-approved with `--allowedTools`, and a pre-approved tool
never consults the host. The project boundary therefore rests on one mechanism, `--restricted`, where the
design intends two. Measurements are in the related task.

## Proposal

1. Launch with `--permission-prompt-tool stdio` and stop pre-approving Edit and Write. Read, Glob and Grep may
   stay pre-approved; measured, they raise no request either way. `--permission-prompts host`,
   `--permission-mode manual`, `--restricted` and `--tools` stay as they are, and the initialize request is
   unchanged.
2. Refuse every request the provider marks with a decision reason (for example `safetyCheck` for
   `.claude/settings.json` or `.git/hooks/*`, `workingDir` for a path outside the working directory) with
   `This file is protected.` A plain in-project edit carries no reason and keeps the in-project allow.
3. Independently of the provider's reason, refuse writes to any path with a `.git` or `.claude` segment, so
   the protected set does not depend on what a later provider build chooses to flag.
4. Adapter suite: assert the launch carries `--permission-prompt-tool stdio` and does not pre-approve Edit or
   Write; add fake-provider cases for a flagged in-project path and for a `.git` path, both refused. Re-run the
   measurement against the deployed provider build: an in-project edit reaches the handler and changes the
   file, and a protected file is refused and not created.

## Risks

- If a provider build stops routing to the host, Edit and Write would be refused rather than silently
  allowed, reproducing the failure fixed in 20260922-2055. The re-measurement in item 4 and the adapter suite
  guard it; the failure is visible (the panel reports the refusal), not a widening.
- Each in-project write now costs one control round trip on stdin/stdout, negligible next to a model turn.
- Item 3 refuses edits to a `.claude` or `.git` path that a user might want the assistant to make. Those are
  not diagram or document files, which is what the panel is for.

## Scope

`src/modules/agents/claude.ts` and `src/modules/agents/adapters.test.ts`, plus README/architecture wording on
the boundary. Codex and Antigravity adapters, the manager, routes, contracts and the UI are unchanged.

## Alternatives

- **Record the channel as gone and keep `--restricted` alone.** Leaves one boundary, and a provider change to
  what `--restricted` confines would leave only the system prompt.
- **Keep Edit/Write pre-approved and add a service-side check after the fact.** A write has already happened
  by the time a `file.changed` event arrives, so this can only report, not refuse.
