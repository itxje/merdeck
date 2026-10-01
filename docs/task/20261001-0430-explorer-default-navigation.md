# 20261001-0430-explorer-default-navigation Restore the default directory view and direct file-type selection

- **status**: in_progress
- **priority**: P1
- **owner**: ui-worker/session-20261001-0430
- **createdAt**: 2026-10-01 04:30

## Description

The owner requests that opening the home page selects All and shows directories, with more convenient file-type selection than a dropdown.

## ActiveForm

Restoring the All directory view and direct file-type controls.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The current default reads a stored file-type preference. A remembered non-All value enters recursive file search and replaces directory navigation. The owner explicitly overrides the earlier persistence behavior: each new page load starts with All. Keep the chosen type while navigating within that page. Replace the icon dropdown with the existing single-selection toggle group, with always-visible All, Mermaid, MD and HTML controls. Preserve explicit recursive type search, directory operations and drafts.

Use the existing frontend acceptance and review baselines. CI optimization remains active in its separate task.

Taskist #50 tracks this owner-requested correction. The page ignores old stored file-type preferences, starts with All and preserves selection only during that page. The existing single-selection toggle group exposes direct type controls with keyboard navigation; controls fit the minimum 180px rail and reach 44px height in the phone drawer.

## Verification

Three focused unit regressions first failed against the stored preference and dropdown behavior. All thirty relevant explorer and conversation unit cases now pass. Frontend lint/typecheck/build pass, with only the four existing lint warnings. Nine focused browser cases passed, including old stored-filter initialization, All after reload, visible folders, direct recursive searches, keyboard switching, minimum width, phone geometry and the unchanged conversation-following assertion. Geometry measurements wait for the drawer's actual opening animation to finish. Desktop and phone screenshots were inspected in `tmp/e2e-7SeIiG/browser-results/`; focused logs are under `/home/alan/warehouse/merdeck-ci-opt-20261001/`.

## Review

Reviewed controlled single selection, keyboard focus, old preference handling, directory/search switching, retained drafts and narrow layout against the frontend policy. No actionable introduced findings. Complete local and native artifact acceptance remain pending.

## Density acceptance

The first complete local run of `6693722` passed the semantic explorer and corrected conversation cases in both artifacts, but both suites failed the unchanged density assertion: 168px above the first row exceeded the 135px ceiling. Preserve that existing limit and at least eighteen visible rows. Compact desktop rail/search spacing and the direct type controls, while keeping 44px phone targets. Type labels use muted foreground on the background surface and selected foreground on the muted surface for readable contrast. All ten focused browser cases, including the unchanged density regression, now pass. No density threshold was relaxed. Final complete acceptance is still required.

Taskist #51 records the existing filename-stem wrapping at the 180px minimum rail as separate future work; it does not change this request's default behavior or type selection.
