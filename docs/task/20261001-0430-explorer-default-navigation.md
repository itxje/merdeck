# 20261001-0430-explorer-default-navigation Restore the default directory view and direct file-type selection

- **status**: completed
- **priority**: P1
- **owner**: ui-worker/session-20261001-0430
- **createdAt**: 2026-10-01 04:30

## Description

The owner requests that opening the home page selects All and shows directories, with more convenient file-type selection than a dropdown.

## ActiveForm

Default All navigation and direct file-type controls are verified and released.

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

## Final acceptance

Clean source `a0cdf10e8762b36ab2376e984cf063b6a001c7c4` passed both frozen installs, the complete local ARM64/overlayfs `check:ci` gate with separate tmpfs refusal storage, and `git diff --check` in 5m21s. Frontend 597, backend 294, file 209, storage 6 and release/CI 52 cases passed. Both complete browser suites passed 106 cases with 17 configuration-dependent skips, concurrently in 3.0m and 3.4m. Their output directories and service cleanup remained separate. Local preparation does not establish native acceptance.

[The exact source run](https://github.com/itxje/merdeck/actions/runs/36816553914) passed in 2m44s. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36816991054) passed complete normal Linux x64/ext4 native acceptance with distinct tmpfs refusal storage and published on attempt 1. Downloaded sanitized records confirm twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters, both complete artifact browser suites and cleanup. Native acceptance is explicitly passed. The verification job took 8m51s, compared with v0.19.17's 13m08s; the complete tag workflow took 9m19s. The final tag supplies the full native proof without a duplicate pre-tag native run.

Both artifact browser suites pass the stored-filter initialization, All after reload, visible folder, direct recursive type selection, keyboard, minimum-width and phone target cases. The existing 110–135px explorer chrome and eighteen-row density assertions are unchanged and pass. Final desktop/phone screenshots were inspected. The corrected conversation resize and deliberate-reading assertion also pass in both artifacts. Delivered in [v0.19.18](https://github.com/itxje/merdeck/releases/tag/v0.19.18); public bytes and build identity are recorded in [the release task](20261001-0435-release-v0.19.18.md). Taskist #51 remains separate deferred filename wrapping work.

- complete: Default All and direct file-type controls pass complete local and native artifact acceptance; released in v0.19.18.
