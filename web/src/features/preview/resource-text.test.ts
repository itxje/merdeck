import { expect, it } from 'vitest'
import { resourceTextFlowchart } from '../../test/resource-text-flowchart'
import { fileLinks, renderSource, validateSource } from './source-policy'

it('preserves ordinary function names and displayed addresses in the original render source', () => {
  expect(() => validateSource(resourceTextFlowchart)).not.toThrow()
  expect(renderSource(resourceTextFlowchart)).toBe(resourceTextFlowchart)
  expect([...fileLinks(resourceTextFlowchart)]).toEqual([])
})

it.each([
  'A["base64url(CBOR(value))"]',
  'A["https://example.invalid/map.json"]',
  'A["HTTP://example.invalid/a//b"]',
  'A("https://example.invalid")',
  'A{"https://example.invalid"}',
  'A[ "https://example.invalid" ]',
  'A["First<br/>https://example.invalid<br/>Last"]',
  'subgraph G["https://example.invalid"]\nA --> B\nend',
])('accepts inert quoted node and group text: %s', (statement) => {
  expect(() => validateSource(`flowchart LR\n${statement}`)).not.toThrow()
})

it.each([
  'click A "https://example.invalid/a.mmd"',
  'click A href "https://example.invalid/a.mmd"',
  'click A call callback("https://example.invalid")',
  'style A fill:url(https://example.invalid/a)',
  'style A fill:base64url(https://example.invalid/a)',
  'classDef a fill:url("https://example.invalid/a")',
  'linkStyle 0 stroke:url(https://example.invalid/a)',
  'A@{ img: "https://example.invalid/a" }',
  'A["`https://example.invalid`"]',
  'A["[Map](https://example.invalid)"]',
  'A["![Map](https://example.invalid)"]',
  'A["https://example.invalid<br src=x>"]',
  'A["https://example.invalid<svg onload=alert(1)>"]',
  'A["https://example.invalid/&lt;img&gt;"]',
  'A["https://example.invalid/&#60;img"]',
  'A["https://example.invalid/\\u003cimg"]',
  'A["https://example.invalid/javascript:alert(1)"]',
  'A["data:image/svg+xml,example"]',
  'A["url(https://example.invalid)"]',
  'A["https://example.invalid/@import"]',
  'A["https://example.invalid/expression(1)"]',
  'A["https://example.invalid"] %% https://example.invalid',
  '%% <img src="https://example.invalid">',
  'A["https://example.invalid"]\n%%{init: {"themeCSS":"url(https://example.invalid)"}}%%',
])('retains resource and unsafe syntax refusals beside allowed text: %s', (statement) => {
  const source = `${resourceTextFlowchart}${statement}\n`
  expect(() => validateSource(source)).toThrow('plain Mermaid')
  expect(() => renderSource(source)).toThrow('plain Mermaid')
  expect([...fileLinks(source)]).toEqual([])
})

it('does not exempt other diagram families or front matter', () => {
  expect(() => validateSource('sequenceDiagram\nA->>B: https://example.invalid')).toThrow('plain Mermaid')
  expect(() => validateSource('---\ntitle: https://example.invalid\n---\nflowchart LR\nA --> B')).toThrow('plain Mermaid')
})
