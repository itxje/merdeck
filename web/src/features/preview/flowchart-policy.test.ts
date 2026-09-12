import { expect, it } from 'vitest'
import { originalSolarSource } from '../../test/original-solar'
import { validateSource } from './renderer'
import { fileLinks, renderSource } from './source-policy'

it('accepts the unchanged original 24-node four-group flowchart', () => {
  expect(() => validateSource(originalSolarSource)).not.toThrow()
})

it.each([
  'graph LR\nA["Voltage < 250V"] --> B & C',
  'flowchart TD; A["x<=10; y < limit"] --> B; classDef warm fill:#aBc,stroke:#123456,stroke-width:1.5px,stroke-dasharray:2 4; class A,B warm;',
  'flowchart LR\nsubgraph Group["Visible group"]\nA & B --> C\nend\nclassDef one,two fill:#fff\nclass A,B one',
  'flowchart LR\nA:::warm <--> B\nclassDef warm fill:#fff',
  'flowchart LR\nA --> B\nclassDef warm fill:#fff,stroke:#123,color:#a1B2c3\nclass A,B warm',
  '%% Ordinary comment\nflowchart LR\nA --> B %% A comment with an unmatched "\nclassDef safe stroke:#ABC,stroke-width:10,stroke-dasharray:100 0 2.5px\nclass A safe',
  'flowchart TB\nsubgraph Group["Visible group"]\nA --> B\nend\nstyle Group fill:#f5f5f5,stroke:#333,stroke-width:3px',
  'flowchart LR\nA --> B\nstyle A,B fill:#fff,color:#111,stroke-dasharray:2 4',
  'flowchart TB\nROOT["Entry"] --> LIMITS["Boundaries"]\nclassDef entry fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;\nclass ROOT entry;',
  'flowchart LR\nA --> B\nstyle A fill:#123456;',
  'flowchart TB\nA1["One"] --> B1["Two"]\nclick A1 "01-system-architecture.mmd"\nclick B1 "docs/02-runtime.md";',
])('accepts nearby bounded ordinary grammar: %s', (source) => {
  expect(() => validateSource(source)).not.toThrow()
})

it.each([
  'classDef safe fill:red',
  'classDef safe fill:#fff garbage',
  'classDef safe fill:#fff!important',
  'classDef safe fill:#fff,',
  'classDef safe fill:#ffff',
  'classDef safe fill:var(--probe)',
  'classDef safe color:red',
  'classDef safe color:#12345',
  'classDef safe background-image:url(/probe)',
  'classDef safe stroke-width:0',
  'classDef safe stroke-width:11px',
  'classDef safe stroke-width:1e2',
  'classDef safe stroke-width:1px\\;fill:red',
  'classDef safe stroke-dasharray:0 0',
  'classDef safe stroke-dasharray:1 2 3 4 5 6 7 8 9',
  'classDef safe stroke-dasharray:101 2',
  'classDef safe stroke-dasharray:5px trailing',
  'classDef safe font-family:probe',
  'classDef safe opacity:0',
  'classDef x}body{ fill:#fff',
  'classDef x:hover fill:#fff',
  'classDef safe fill:#fff; @import "/probe"',
  'classDef safe fill:#fff; style A fill:red',
  'classDef safe fill:#fff; click A callback',
  'click A "https://example.test"',
  'click A "../secret.mmd"',
  'click A "/etc/passwd"',
  'click A "notes.txt"',
  'click A "a.mmd" "A tooltip"',
  'click A a.mmd',
  'click A href "a.mmd"',
  'click A call open()',
  'click A ""',
  'style A fill:red',
  'style A fill:#fff!important',
  'style A background-image:url(/probe)',
  'style A opacity:0',
  'style A stroke-width:11px',
  'style A fill:#fff garbage',
  'style A',
  'style A, B fill:#fff',
  'style A fill:#fff; click A callback',
  'linkStyle 0 stroke:#fff',
  'classDef safe fill:&#35;fff',
  'class A safe trailing',
  'class A,something[onclick] safe',
  'A:::safe.evil',
  'A["Value <img"]',
  'A["Value < img src=x >"]',
  'A["Value <br onload=alert(1)>"]',
  'A["Value &lt;img&gt;"]',
  'A["Value &#x3c;img"]',
  'A["Value #60;img"]',
  'A["Value #0c4a6e;"]',
  'A["Value#60;"]',
  'A["Value <br/>#60;img"]',
  'A["Value < 250V"]\n%%{init:{}}',
])('rejects nearby unsafe grammar before rendering: %s', (statement) => {
  expect(() => validateSource(`flowchart LR\nA --> B\n${statement}`)).toThrow('plain Mermaid')
})

it.each([
  '---\ntitle: Mesh client lifecycle\n---\nstateDiagram-v2\n[*] --> Ready',
  '---\ntitle: A plan\n---\nflowchart LR\nA & B --> C\nclassDef warm fill:#fff\nclass A warm',
  '---\ntitle:\n---\nflowchart LR\nA --> B',
])('accepts a title-only front matter: %s', (source) => {
  expect(() => validateSource(source)).not.toThrow()
})

it.each([
  '---\nconfig:\n  theme: base\n---\nflowchart LR\nA --> B',
  '---\ntitle: A plan\ndisplayMode: compact\n---\nflowchart LR\nA --> B',
  '---\ntitle: Value < 250V\n---\nflowchart LR\nA --> B',
  '---\ntitle: See https://example.test\n---\nflowchart LR\nA --> B',
  '---\ntitle: Style guide\n---\nflowchart LR\nA --> B',
  '---\ntitle: A plan\n---\n---\ntitle: Another\n---\nflowchart LR\nA --> B',
  'flowchart LR\nA --> B\n---\ntitle: A plan\n---',
  '---\nflowchart LR\nA --> B',
])('refuses front matter beyond one title: %s', (source) => {
  expect(() => validateSource(source)).toThrow('plain Mermaid')
})

it.each(['&ltimg src=x', '&lt', '&GT', '&amp#60;img', '&quotonclick', '<br/><img', 'classDef safe fill:#fff:bad', 'classDef safe'])('refuses incomplete encoding and declarations: %s', (text) => {
  expect(() => validateSource(`flowchart LR\nA["${text}"]`)).toThrow('plain Mermaid')
})

it.each(['A --> B %% classDef evil background-image:image-set("/probe")', '%% classDef evil opacity:0'])('retains global checks on comment tails: %s', (statement) => {
  expect(() => validateSource(`flowchart LR\n${statement}`)).toThrow('plain Mermaid')
})
it('accepts an ordinary comment at end of input', () => {
  expect(() => validateSource('flowchart LR\nA --> B %% Ordinary comment with an unmatched "')).not.toThrow()
})

it('names the files a validated source links to, and nothing else', () => {
  const source = 'flowchart TB\nA1["One"] --> B1["Two"]\nclick A1 "01-system-architecture.mmd"\nclick B1 "docs/02-runtime.md"\n'
  expect(() => validateSource(source)).not.toThrow()
  expect([...fileLinks(source)]).toEqual([['A1', '01-system-architecture.mmd'], ['B1', 'docs/02-runtime.md']])
  expect([...fileLinks('flowchart LR\nA --> B')]).toEqual([])
  // A click outside a flowchart is refused, so it never becomes a link.
  expect(() => validateSource('stateDiagram-v2\n[*] --> Ready\nclick Ready "a.mmd"')).toThrow('plain Mermaid')
  expect([...fileLinks('stateDiagram-v2\n[*] --> Ready\nclick Ready "a.mmd"')]).toEqual([])
})

it.each(['\n', '\r\n'])('extracts relative targets after supported title front matter using %j', (newline) => {
  const source = ['---', 'title: Diagram overview', '---', '%% Ordinary comment', 'flowchart TB', 'A[One] --> B[Two]; click A "details/one.mmd";', 'click B "two.md"'].join(newline)
  expect(() => validateSource(source)).not.toThrow()
  expect([...fileLinks(source)]).toEqual([['A', 'details/one.mmd'], ['B', 'two.md']])
})

it('projects only validated statements and preserves titles, quoted separators, comments and styles', () => {
  const source = '---\r\ntitle: Diagram overview\r\n---\r\n%% Header with an unmatched "\r\nflowchart LR; A["First; second<br/>row"] --> B; click A "one.mmd" %% Tail with an unmatched "\r\nclick B "docs/two.md"; style A fill:#fff;\r\n%% Final comment "'
  const projected = source.replace('click A "one.mmd"', ' '.repeat('click A "one.mmd"'.length)).replace('click B "docs/two.md"', ' '.repeat('click B "docs/two.md"'.length))
  expect(renderSource(source)).toBe(projected)
  expect([...fileLinks(source)]).toEqual([['A', 'one.mmd'], ['B', 'docs/two.md']])
  expect([...fileLinks(projected)]).toEqual([])
  expect(renderSource(projected)).toBe(projected)
  const sequence = '---\ntitle: Conversation\n---\nsequenceDiagram\nA->>B: Hello\n'
  expect(renderSource(sequence)).toBe(sequence)
  expect(renderSource(originalSolarSource)).toBe(originalSolarSource)
})

it.each([
  'click A "//example.test/a.mmd"',
  'click A "javascript:alert.mmd"',
  'click A "data:example.mmd"',
  'click A "https://example.test/a.mmd"',
  'click A "../a.mmd"',
  'click A "nested/../a.mmd"',
  'click A "./a.mmd"',
  'click A "nested//a.mmd"',
  'click A "nested\\a.mmd"',
  'click A "%2e%2e/a.mmd"',
  'click A "a.mmd?x=1"',
  'click A "a.mmd#node"',
  'click A "a.svg"',
  'click A "a.mmd" _blank',
  'click A call callback()',
  'click A href "a.mmd"',
  'click A "a.mmd"; style A transform:translate(1)',
  '%% click A "a.mmd"',
  `click A "${'a'.repeat(200)}.mmd"`,
])('does not project or extract a partially valid source: %s', (statement) => {
  const source = `---\ntitle: Overview\n---\nflowchart LR\nA --> B\nclick B "safe.mmd"\n${statement}`
  expect(() => renderSource(source)).toThrow('plain Mermaid')
  expect([...fileLinks(source)]).toEqual([])
})
