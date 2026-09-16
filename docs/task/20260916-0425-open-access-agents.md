# 20260916-0425-open-access-agents Allow agent providers with open access

- **status**: completed
- **priority**: P1
- **owner**: coordinator/20260916-0425
- **createdAt**: 2026-09-16 04:25

## Description

Remove the requirement to configure `MERDECK_TOKEN` before an explicitly configured local agent provider can be used. Open-access deployments must expose the AI file editor and support the same bounded conversation, turn, approval, cancellation and SSE flow while retaining exact-Origin mutation checks, provider-path validation, process sandboxing and the existing deliberate opt-in required for non-loopback open access.

## ActiveForm

Allowing bounded agent editing in open-access deployments.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: startup currently rejects either provider path when `MERDECK_TOKEN` is absent, agent routes reject a missing authenticated session, and the workspace renders the AI entry and pane only for `access: 'token'`.
- Investigation: open-access file mutations already require an exact configured Origin, while non-loopback exposure still requires explicit `MERDECK_OPEN_ACCESS=true`. Provider executable paths remain explicit, canonical, executable and outside `MERDECK_ROOT`.
- Authorization: the owner explicitly requested removal of the `MERDECK_TOKEN` requirement for the internal-network deployment and authorized implementation.
- Proposal: [20260916-0425-open-access-agents](../plan/20260916-0425-open-access-agents.md).
- Verification: backend configuration, manager and HTTP tests passed; frontend workspace and agent tests passed; the provider-enabled production browser suite passed with exact Origin, no open-access cookie or CSRF header, exact disk bytes and live SVG reconciliation. Two unrelated compiled-browser aggregate attempts each observed one transient directory `unavailable` response in different pre-existing refresh cases; both affected cases then passed five consecutive focused repetitions.
- Review: shared, TypeScript backend and TypeScript frontend review found no critical or high findings. Provider executable, sandbox, Host, Origin, storage, output and lifecycle boundaries remain unchanged.

- complete: Focused backend/frontend tests, full provider-enabled production browser acceptance, targeted repeat checks, lint, typecheck and build passed; self-review found no critical or high findings.
