# BOOT-001 Establish repository foundation

- **status**: completed
- **priority**: P1
- **owner**: Repository maintainer
- **createdAt**: 2026-09-07 17:37

## Description

Investigate the empty repository, persist the authorized MVP proposal, and establish repository hygiene and canonical project tracking without feature implementation.

## ActiveForm

Establishing repository foundation

## Dependencies

- **blocked by**: (none)
- **blocks**: STACK-001

## Notes

- The user authorized the MVP implementation on 2026-09-07; this is the original authorization date, with no time supplied. Investigation and proposal must be recorded before hygiene implementation.

### Investigation

- Claimed the task and re-read the index and detail before substantive investigation. The repository contained only an empty initialization commit; no application, tracking files, architecture, license, dependency manifest, or existing project instructions were present. No pre-existing changes or Git remote were found.
- Installed tools: Bun 1.3.12, Node 24.20.0, npm 11.19.0, tmux 3.5a. The `nsl` binary and optional machine-specific tmux workflow reference were absent. No server was started.
- Read the PMA workflow, tracking, canonical task/plan formats, project injection, delivery and development-environment references; the backend/frontend entries and baselines; and the design entry. Full design methodology and execution belong to DESIGN-001.
- Official registry queries on 2026-09-07 returned Bun 1.4.2, Vite 8.2.2 and nsl 0.1.7. The official runtime release index returned Node 26.8.1 as current and Node 24.20.0 as latest LTS. Vite's published engine range is `^20.19.0 || >=22.12.0`. See [runtime decision](../decisions/2026-09-07-runtime-and-scope.md) for sources and reproducible queries.
- No dependency was installed. Local Bun is older than the proposed exact pin; STACK-001 must provision and verify the pinned runtime within the project before application checks. Registry metadata and existing binary checks do not establish application compatibility.

### Proposal

- Establish the full [MVP plan](../plan/PLAN-001.md), [architecture](../architecture.md), sequential task details, and repository hygiene only. Persist investigation and proposal before writing hygiene files. Preserve the original authorization date with day-level precision; keep the overall plan implementing until delivery checks pass.
- Pin Bun 1.4.2 and Node 24.20.0, with the Node LTS choice documented. Limit the bootstrap manifest to a private project name and runtime engines. Add no scripts, dependency declarations, lockfile, feature code, or prototype in this task.
- Document the file-only storage decision, root containment and save/conflict threats, auth/rendering controls, planned checks, and explicit main-integration boundary in the plan. All design defaults are assumptions; prototype status remains `needs-review` when it is created.
- Keep licensing at an explicit All rights reserved default because no license existed and public licensing was not authorized. Adapt the standard Node and global ignore templates to this project, preserving design deliverables.
- Accepted alternatives and risks are in the plan; no database, workspace, hosted service, or additional application scope is introduced.

### Authorization and phase ordering

- Original user authorization: 2026-09-07, date only. It covers the stated MVP, initial implementation work, and routine corrections/defaults within that scope. This note records existing authorization, not a new approval.
- Investigation and proposal were persisted before hygiene implementation. This task's work does not approve a design or authorize final integration into main.

### Verification plan

- Run the phase file-presence and whitespace command recorded below after authoring all bootstrap files. Stage only the permitted paths, then run `git diff --cached --check` to include new files in whitespace validation.
- Inspect every local Markdown link, task marker/status/owner pair, sequential dependency, and authorization precision. Scan authored text for non-English text and internal identifiers. Verify ignore coverage and that `designs/diagramdock/` artifacts remain eligible for tracking.
- Validate the manifest has only `name`, `private`, and verified `engines`; confirm no `src/`, `web/`, or design feature implementation. No application lint, build, tests, HTTP preview, or browser check is available at this phase.

```bash
git diff --check && bash -c 'for f in AGENTS.md .gitignore .gitattributes .editorconfig LICENSE README.md .env.example package.json docs/task/index.md docs/task/BOOT-001.md docs/task/STACK-001.md docs/task/DESIGN-001.md docs/task/FILE-001.md docs/task/API-001.md docs/task/UI-001.md docs/task/TEST-001.md docs/task/REVIEW-001.md docs/task/DOC-001.md docs/plan/index.md docs/plan/PLAN-001.md docs/architecture.md docs/changelog.md; do test -s "$f" || exit 1; done'
```

### Completion evidence

- Completed on 2026-09-07 after the investigation/proposal artifacts and hygiene baseline were present. Retained the recorded original authorization and findings throughout the work.
- The complete structural command above passed (exit 0). Inspected staged additions and ran `git diff --cached --check` successfully; this includes new files absent from an unstaged diff.
- `bun tmp/check-bootstrap.ts` passed: 25 scoped files, nine task markers/statuses/owners and sequential dependencies, 55 local Markdown links, exact runtime-only manifest, original authorization precision, neutral English text and absence of feature directories. The temporary checker is ignored evidence, not an application test or shipped dependency.
- `git check-ignore .env .env.local secrets/token.txt server.key server.pem logs/service.log tmp/evidence.txt node_modules/example/index.js web/node_modules/example/index.js dist/index.js web/dist/index.html coverage/report.json` matched every listed sensitive/generated path. Individual `git check-ignore -q` checks confirmed `.env.example` and the planned design HTML, metadata, TypeScript source and SVG asset paths are not ignored.
- Verified the instruction alias is a symlink with index mode `120000`, pointing to `AGENTS.md`. The manifest contains only `name`, `private` and `engines`; no dependency, script or lockfile was introduced.
- Only BOOT-001 is completed. All successors remain pending and unassigned; PLAN-001 remains implementing. Remaining work is the planned stack, prototype, application, acceptance, review and delivery. Bun 1.4.2 application verification and nsl setup remain STACK-001 responsibilities.
- Preview evidence: not applicable to this documentation-only stage. No URL, application server, browser checks, lint/build results or runtime compatibility success is claimed.
