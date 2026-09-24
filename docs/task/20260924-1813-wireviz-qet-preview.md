# 20260924-1813-wireviz-qet-preview Preview WireViz harnesses and QElectroTech projects through local renderers

- **status**: in_progress
- **priority**: P2
- **owner**: l1/session-20260924
- **createdAt**: 2026-09-24 18:13

## Description

Open WireViz harness files and QElectroTech projects in Merdeck. WireViz files (`*.wireviz.yml` /
`*.wireviz.yaml`) are edited as source and previewed from Graphviz DOT produced by a locally installed
`wireviz`, rendered by Graphviz WASM in the browser. QElectroTech `.qet` projects are previewed read-only,
one folio at a time, from SVG exported by a locally installed QElectroTech development build. Both
renderers are optional host software invoked as separate processes.

Acceptance: with the renderers configured, a WireViz file is edited and its preview follows the draft,
including images inside the project, and a `.qet` project shows each folio and refreshes after the file
changes; images or paths outside the project are refused before a renderer runs; without the renderers
the files still open with a clear notice; the repository gate, the browser suite and the opt-in
real-renderer check on the deployment host pass.

## ActiveForm

Proposing WireViz and QElectroTech previews.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-24): WireViz 0.4.1 writes DOT with `-f gt` and needs no Graphviz binary;
  `@viz-js/viz` renders all 24 upstream examples in the browser. QElectroTech's `--export-svg` exists only
  in development builds after 0.100; built from source on the arm64 host it exported 23 of 24 examples
  headless in 0.1-0.7 s. Evidence lives in the ignored `tmp/wireviz-research/` and `tmp/qet-research/`.
- Proposal: [20260924-1803-wireviz-qet-preview](../plan/20260924-1803-wireviz-qet-preview.md), reviewed in
  two rounds by a second session; awaiting approval and the owner's confirmation of the `*.wireviz.yml`
  naming convention.
