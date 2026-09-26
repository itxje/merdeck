# 20260926-1307-logout-poll-audit-race Make the logout browser audit tolerate its in-flight poll

- **status**: pending
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-09-26 13:07

## Description

The workspace browser case logs out while directory revision polling can be in flight. The server can answer that request with 401 after credentials are cleared; the test's global audit then fails despite the expected logout state. Reproduce and scope the expected 401 allowance to the logout transition without hiding unexpected pre-logout responses.

## ActiveForm

Waiting for a focused regression and correction of the logout audit race.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- [v0.19.4 tag workflow](https://github.com/itxje/merdeck/actions/runs/36242708893) attempt 1: 92 browser cases passed; `workspace.spec.ts:34` failed only in `support.ts:51` on `Unexpected HTTP 401 /api/diagrams/directory/revision` and the corresponding browser console error. The same SHA and tag passed on attempt 2. This issue is outside the mobile drawer change.
