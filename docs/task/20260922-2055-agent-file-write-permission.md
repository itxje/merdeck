# 20260922-2055-agent-file-write-permission Let the assistant write the files it is asked to change

- **status**: completed
- **priority**: P1
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-22 20:55

## Description

The assistant panel cannot change any file. It reads the file, prepares the edit, and then reports that it
lacks permission to write and asks the operator to grant it — advice the operator cannot act on, because the
panel has no such control and the approval step was removed on purpose.

Reproduced against the provider the deployed service runs, with the exact arguments the adapter passes: the
provider refuses the write itself and never asks this service to decide. The host answers every permission
request for an in-project path with allow, so that code never runs; the provider's own gate denies the write
first, with `Claude requested permissions to write to <path>, but you haven't granted it yet`. Read, glob and
grep are unaffected, which is why the panel looks alive right up to the moment it has to write.

The remedy is to name the file tools the adapter already restricts itself to as pre-approved, so the provider
stops holding them behind a prompt nobody can answer. The project boundary does not depend on that prompt:
`--restricted` confines the file tools to the working directory, which the adapter sets to the project root.

Acceptance: `bun run check` passes, the adapter suite asserts the launch names those tools, and a real turn
against the deployed provider changes a file inside the project and still refuses one outside it.

## ActiveForm

Restoring the assistant's ability to write project files.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Proposal: [20260922-2055-agent-file-write-permission](../plan/20260922-2055-agent-file-write-permission.md).
- The provider is asked for a decision zero times, for any tool, under every argument combination tried:
  a different permission mode, an extra allowed directory, and dropping the restricted flag all leave the
  write refused. Naming the file tools as pre-approved is the only one that lets it through.
- The boundary does not move. The restricted flag refuses a write to a sibling directory on its own, with
  `<path> is outside <root>; --restricted confines the file tools to the working directory.`, and the
  session still carries no command or network tool.
- Verified through the adapter itself against the provider build the deployment runs: an in-project turn
  emits `tool.started Edit notes.md`, `file.changed notes.md` and `turn.completed`, and the bytes on disk
  change; an out-of-project turn creates nothing.
- Local `bun run check` passed with Bun 1.4.2 (289 backend tests, 577 web tests, lint, strict type checks,
  coverage and both production builds); the browser suite passed 105 of 105 with 2 skipped by design.
- Two environment repairs were needed first, both lost when the container restarted and neither a code
  problem: the fixture parents the storage suite requires, and the browser's system libraries.

- complete: Delivered; check and the browser suite passed.
