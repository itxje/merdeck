# 20261001-0922-copy-absolute-file-path Copy the active file's absolute path from the header

- **status**: completed
- **priority**: P2
- **owner**: header-worker/session-20261001-0922
- **createdAt**: 2026-10-01 09:22

## Description

Replace the header's displayed relative path with the filename and an icon button that copies the active file's absolute server-side path. Preserve editing context and save feedback, and expose copy success/failure accessibly.

## ActiveForm

The compact header and absolute-path copy control are verified and released.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The owner's screenshot and explicit implementation request authorize this Full-tier frontend/backend change up front. Absolute path means the configured service root joined to the validated selected file path; do not infer host paths from the container. Keep existing session, Origin and file boundaries. No new dependencies or unrelated UI changes.

## Implementation and verification

The new GET location endpoint shares strict read request validation, the existing session/Host/Origin boundary and the contained repository read. It returns only the validated selected file and its path under the canonical service root. The frontend strictly decodes the response and rejects a different selected-file response. An isolated header copy component prepares its data through a session/selection-scoped Query; the click calls clipboard.writeText directly. The filename and existing editing/save metadata remain beside the icon.

Three location HTTP cases first failed against the missing route, and the workspace regression first failed on the displayed directory prefix. Both become green. Location checks cover both API mount modes, nested Unicode names, strict queries, deleted files (the existing 410 contract), symlinks, methods, Origin refusal and unauthenticated disclosure prevention. Twenty-eight focused frontend cases pass, covering exact clipboard bytes, unavailable/rejected responses, clipboard denial, pending readiness and late completion after selection changes. Root/frontend lint and types pass (four pre-existing frontend warnings).

A focused real-browser case passes through actual authenticated services and native clipboard permissions, including keyboard copy, nested and root-level files, desktop/phone layout and the 44px phone target. Services and fixture roots were cleaned up. Screenshot review found that visible success text displaced the filename and the 44px button enlarged the text row; the control now sits beside the full filename/metadata group and confirms success with its check mark plus an accessible status. The final layout passed the refreshed browser case (1.7 seconds); screenshot inspection confirms that welcome.mmd and the save status fit beside the phone copy icon. Refresh files also invalidates the active path Query so a refused transient location can be requested again.

The location contract retains the repository's documented plain-Hono/Zod routing compatibility choice; no framework/dependency migration is included. Complete project preparation and release acceptance remain pending.

## Implementation review

Shared, TypeScript backend and frontend review found no actionable introduced issues. The absolute value is formed only after the existing held-descriptor repository read succeeds; errors retain safe messages and the old deleted-file status. The HTTP route preserves strict queries and every existing read boundary in both mount modes. Frontend query results are tied to the selected file and session, clipboard writes require prepared validated data, and late completion stays with its keyed component. No persistent storage or new filesystem write is introduced. Screenshot review covers the desktop/phone hit area, filename visibility and preserved save status. Complete acceptance remains required.

Taskist #54 tracks this delivery. Complete local preparation and matching source verification precede the v0.19.20 tag; that workflow supplies actual Linux x64/ext4 native acceptance and publication without another manual native run.

## Complete regression correction

The first complete local gate on `344f750` failed on ten legacy browser expectations per artifact suite: relative-path header captions, closed request lists missing the location read, and scoped deletion/auth-loss allowances missing its 410/401 responses. The new clipboard case, all unit/file/storage cases and physical directory checks passed, and both artifact fixture/service lifecycles cleaned up. No tag was created from that failed gate.

The affected tests now assert the filename while checking the complete relative navigation URL, explicitly admit only the new application endpoint in request lists, and allow its expected status only within the existing deletion/auth-loss scenarios. Production code and security assertions are unchanged. Matching source verification for `344f750` passed; delivery will use the corrected clean source and a fresh complete local gate.

All twenty-six affected real-browser cases now pass in 1.8 minutes with zero unexpected browser errors and complete service/fixture teardown. Frontend lint and types pass with the same four pre-existing warnings. Focused review of the assertion changes finds no actionable issues: basename display is paired with exact full navigation-path checks; request/status allowances remain explicit and scenario-scoped.

## Final acceptance and delivery

Clean source `ea466b2947c499331b2f85d3ad446188d9de7e32` passed both frozen installs, complete local ARM64/overlayfs `check:ci` with separate tmpfs refusal storage and `git diff --check` in 8m47s. Frontend 612, backend 303, file 212, storage 6 and release/CI 52 cases passed. Both full artifact browser suites passed 107 cases with 17 configuration-dependent skips and clean service/fixture teardown. The new case exercises exact native clipboard bytes, Unicode/nested and root-level files, keyboard activation, selection reset, empty selection and the 44px phone control.

[The exact source run](https://github.com/itxje/merdeck/actions/runs/36844664268) passed in 2m45s. [The v0.19.20 tag workflow](https://github.com/itxje/merdeck/actions/runs/36845704073) passed complete normal Linux x64/ext4 acceptance with distinct tmpfs refusal storage and published on attempt 1; verification took 6m39s. Downloaded sanitized records confirm all twenty raw controls, file/HTTP checks, physical source/bundle/compiled directory adapters and both artifact browser suites. Native acceptance is explicitly passed. Publication uses the exact same-run checked artifact; no earlier artifact or extra manual native run was used.

[v0.19.20](https://github.com/itxje/merdeck/releases/tag/v0.19.20) contains the filename header and absolute-path copy control. Public assets match GitHub digests and publisher provenance; SHA256SUMS validates the archive. Its 97-file bundle reports version 0.19.20, tag v0.19.20, the exact commit and Bun 1.4.2. The annotated remote tag resolves to that source. Archive SHA-256: `74cc198aec73a008fac561dc22a2e77dab505df6b2a7bafc8049fb4e744bf12e`. Evidence is under `/home/alan/warehouse/merdeck-header-copy-20261001/`.

Taskist #54 is complete. Absolute paths are service/container filesystem paths; no host filesystem path was inferred and no running deployment configuration was changed.

- complete: Released v0.19.20 after complete local, source, native and public asset verification.
