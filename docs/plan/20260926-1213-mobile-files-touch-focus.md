# 20260926-1213-mobile-files-touch-focus Restore first-open Files scrolling on iOS

- **status**: implementing
- **createdAt**: 2026-09-26 12:13
- **approvedAt**: 2026-09-26 12:10 UTC
- **relatedTask**: 20260926-1212-mobile-files-first-open-scroll

## Context

The owner reports that the released v0.19.3 still cannot scroll the first-open phone Files drawer; its Refresh or file-type controls make scrolling work. The live service reports version 0.19.3. The drawer's `initialFocus={drawerFilterRef}` forces focus to its search input on every open, including a touch open. The installed Base UI dialog otherwise supplies touch-sensitive default focus handling; in this controlled opening, browser tests resolve its initial focus to the Root breadcrumb instead of the text input. The owner screenshot shows the search input focused. The previous attempt only changed overflow styles; Linux browser tests cannot emulate an iOS native scroll layer.

## Proposal

1. Add a mobile touch-open browser regression that opens Files with a touch gesture, verifies that the search field is not auto-focused, and swipes the populated list before using Refresh or file-type controls.
2. Remove the drawer's forced search focus and use the dialog's own focus management, preserving the field's normal focus when tapped and keyboard access to every control. Revert the v0.19.3 overflow overrides that did not repair the phone and added an unnecessary iOS accelerated-scroll mode.
3. Run the focused drawer and frontend checks, then the repository gate on a clean candidate. Record the native iOS verification limit and obtain phone validation of the new build before considering the problem resolved.

## Risks

- The focus change may not be the only iOS scroll-layer cause. The browser regression proves the initial focus contract and Chromium swipe, but only an affected iPhone can prove the native gesture works.
- Keyboard users will initially focus the dialog according to Base UI's default instead of the search field. Verify tab order and Escape/return focus.

## Scope

The phone/tablet Files dialog focus behavior, removal of the failed overflow overrides, one focused browser regression, and task evidence. No API, file content, dependency, deployment or unrelated dialog change.

## Alternatives

- Removing popup scale animation could avoid a WebKit compositing issue, but the direct evidence that Refresh and type clicks move focus away from the search field makes the forced focus the narrower first correction.
- Making the entire sheet scroll would change the position of its controls and footer.

## Annotations

- 2026-09-26 12:10: The owner reported that the previously released fix still fails. This authorizes correction of that failed repair.

## Outcome

The clean code commit `bfe0a9b` passed local ARM64/overlay `check:ci` with two 93-case browser runs and bundle acceptance. Linux WebKit confirmed the focus and overflow geometry, while Chromium confirmed the first swipe. The candidate passed native Linux x64/ext4 acceptance and shipped as v0.19.4. Native iOS scrolling remains unverified, so the task stays open for affected-phone testing after deployment.
