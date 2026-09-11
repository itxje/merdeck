## Project Development

Merdeck follows `/pma`. Apply `/pma-bun` to the backend, `/pma-web` to the frontend, `/pma-design` to the prototype, and `/pma-cr` to implementation review.

### Project-specific facts

- TypeScript application; Bun API at the root and an independent sibling `web/` SPA, without workspaces.
- Runtime pins: Bun 1.4.2; Node 24.20.0 for development tooling. Use a project-local Bun 1.4.2 binary if the system runtime differs; see STACK-001 evidence.
- Storage: files beneath one explicitly configured `MERDECK_ROOT`; no database.
- Deployment: one local service instance per root, with a same-origin built SPA and API.
- Development routing: project-local nsl with a unique `merdeck-<path-hash>` host and discovered proxy port; production has no nsl dependency.
- Current state: file explorer with file and folder operations and optional access-token sign-in (open access without a token), independent Markdown blocks, source editor, constrained live preview, practical saves and external-change polling. Production serves the SPA and API; compilation embeds the runtime, backend and all frontend assets in one executable. Historical local ARM64/overlay execution and actual hosted ext4/Linux x64 source/executable acceptance are verified; final independent implementation review passed with no remaining actionable findings. The reviewed implementation was integrated into `main` on 2026-09-09, and later owner-approved changes are delivered on `main`. The prototype remains needs-review.
- File writes: Linux/procfs with matching held-descriptor mount/type/device checks admits overlayfs (0x794c7630) and ext4 (0xef53). Admission is distinct from deployment acceptance; shared, tmpfs and unknown storage remain write-refused. Preserve identity/version checks and the final comparison/rename and local OS actor limitations. External editors retain direct access to the configured original project. Use explicit identified supported/refused fixture parents from README for checks.
- Quality gate: `bun install --frozen-lockfile && bun install --cwd web --frozen-lockfile && bun run check:ci && git diff --check`. Install the documented browser/actionlint/tracing prerequisites and use tmux; evidence belongs in ignored `tmp/`. Final native delivery additionally requires the normal `bun run check:ci --native` on actual Linux x64/ext4 with separate refusal storage; local overlay checks are insufficient.
- Prototype location: `designs/merdeck/`; visual defaults are assumptions and asset review status starts at `needs-review`.

### Local decisions and tracking

- [Stack compatibility and contracts](docs/decisions/2026-09-07-stack-compatibility.md)
- [Runtime and scope decisions](docs/decisions/2026-09-07-runtime-and-scope.md)
- [Tasks](docs/task/index.md)
- [Plans and authorization](docs/plan/index.md)
- [Architecture](docs/architecture.md)
- [Changelog](docs/changelog.md)
