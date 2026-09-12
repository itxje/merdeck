# LAYOUT-006 Show the running version in the status bar

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner noticed that the page neither shows nor offers a way to see the running version. The executable reports it through `--version` and `--build-info`, and each release names it, but nothing in the interface does. The owner asked for this small change directly. Acceptance: a connected workspace names the running version, a service started from source says so instead of inventing a number, and the version is not disclosed before a token-protected service accepts a session.

## ActiveForm

Showing the running version in the status bar.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `src/shared/build-info.ts` holds the compiled `BuildInfo` (`version`, `prerelease`, `tag`, `commit`, `target`) and the `development` fallback, and `startService` uses it only for `--version` and `--build-info`; it never reaches `createApp`. GET `/api/build` is public and returns the asset identity and poll interval, while the session status already carries the capabilities the workspace needs. Reporting the version through the session keeps it behind the token in token mode, where GET `/api/build` would expose it to anyone who can reach the service.
- Implementation (2026-09-12): `AppServices` takes the optional `BuildInfo`, `startService` passes it, and `authRoutes` receives the version and reports it in `SessionCapabilities` (`development` when a service runs from source). The web session decoder requires the field, and the status bar names it as `Merdeck <version>` beside the connection state and the draft note.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2): `bun run check` passed inside the project tmux session with the supported overlay fixture parent under `/tmp` and the checkout `tmp/` as the refused parent, running 190 backend tests across 9 files and 195 frontend tests across 18 files, including the session contract test that now lists the reported keys and expects `development` from a source build. Lint, strict type checks and the production build passed, and the full browser suite passed 42 of 42 in 2.0 minutes with a new status bar assertion. A disposable compiled executable then reported `Merdeck 0.0.0-ci.fixture` from `--version` and the same version through its session, so a released build names its real version.
