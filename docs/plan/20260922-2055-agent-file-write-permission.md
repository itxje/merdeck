# 20260922-2055-agent-file-write-permission Let the assistant write the files it is asked to change

- **status**: completed
- **createdAt**: 2026-09-22 20:55
- **approvedAt**: 2026-09-22 20:55 UTC
- **relatedTask**: 20260922-2055-agent-file-write-permission

## Context

Measured against the provider build the deployed service is configured to run, driven with the adapter's own
argument list and protocol:

- The provider asks this service for a permission decision zero times, for any tool. The adapter's handler,
  which allows an in-project path and denies anything else, is never reached.
- An edit inside the project fails with `Claude requested permissions to write to <path>, but you haven't
  granted it yet`, and the file is unchanged. Read succeeds, so the failure only appears at the write.
- Naming the file tools as pre-approved is the only argument change that lets the edit through. Neither a
  different permission mode, nor an extra allowed directory, nor dropping the restricted flag helps.
- The restricted flag confines the file tools to the working directory on its own: a write to a sibling
  directory is refused with `<path> is outside <root>; --restricted confines the file tools to the working
  directory.` The adapter sets that working directory to the project root.

## Proposal

Name the same five tools the adapter already limits the session to — read, edit, write, glob and grep — as
pre-approved at launch, so the provider stops holding them behind a prompt that reaches nobody.

The permission handler stays. It costs nothing, and it is the only boundary if a provider build does ask.

## Risks

- Pre-approval removes a second gate in front of writes. The project boundary does not rest on it: the
  provider confines file tools to the working directory, the session carries no command or network tool, and
  the adapter still refuses an out-of-project path whenever it is consulted.
- A later provider build could rename the argument. The adapter suite asserts the launch names these tools,
  so a rename fails the suite rather than the panel.

## Scope

`src/modules/agents/claude.ts` and the adapter suite. No contract, storage or interface change.

## Alternatives

- **Accept edits automatically through the permission mode.** Rejected: measured not to help, and it would
  drop the refusal for out-of-project paths that the handler still applies when consulted.
- **Leave it and document the limitation.** Rejected: the panel's stated purpose is editing files, and it
  currently cannot change one.

## Annotations

- Delivered under the standing arrangement to fix and release a user-visible defect without asking.

## Outcome

The adapter names the five file tools as pre-approved at launch, using the same list it already limits the
session to, and the adapter suite asserts both arguments carry it. A turn driven through the adapter against
the provider build the deployment runs now changes an in-project file and still creates nothing outside the
project. The permission handler is unchanged.
