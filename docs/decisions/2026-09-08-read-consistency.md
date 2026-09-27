# Bounded read consistency

Date: 2026-09-08

Status: accepted for implementation under the original day-level continuous correction authorization; final integration and prototype approval remain separate.

## Evidence and decision

Two controlled authenticated baseline requests independently reproduced a transient forbidden response when a successful save unlinked an already opened read descriptor, and a transient conflict when an independent process edited the file after initial stat. Each following stable request returned 200. The events used real descriptors and filesystem metadata. These observations do not assign causes to older browser failures without request/phase evidence. [PLAN-011](../plan/PLAN-011.md) preserves exact baseline results and alternatives.

Read-only document, revision and tree file reads now make at most three complete attempts. Only a private consistency classification permits reopening: an actually unlinked regular descriptor, or the existing identity/metadata mismatch with a current regular single-link target on the original device. An unsuccessful attempt closes its target and directory descriptors before the next attempt reopens and revalidates the full chain. Successful bytes still pass the original root, ancestor, descriptor, path, identity, link-count, size and metadata checks. The limit has no delay, polling or return of unchecked bytes.

Continued churn returns typed conflict. Deletion retains its typed document/revision behavior. Ordinary forbidden, conflict and unavailable errors do not trigger retries; hardlinks, symlinks, nonregular targets, permissions, size limits and changed roots remain refused. The read-only descriptor hook exists for controlled tests, uses actual handles and never runs for write comparisons.

## Limits

This is a bounded opportunity to obtain a consistent snapshot, not a promise of success during ongoing editing or a lock against later changes. No write admission, expected version, save serialization, temporary-file or publication behavior changes. External tools retain direct access to original files. The final comparison/rename counterexample and applicationSafetyPassed=false remain unchanged. Local overlay tests do not establish new native/ext4/x64, combined editor or live HTTPS acceptance.

See [READ-001](../task/READ-001.md) for verification and review evidence.

## Acceptance status

The focused read/file/API checks passed. The single clean-commit aggregate stopped at test import ordering; a two-import correction passes the actual Node-backed scoped lint. The aggregate remains unpassed and was not repeated. This decision is implemented but awaits required acceptance; it does not certify a new executable, browser, native or live build.
