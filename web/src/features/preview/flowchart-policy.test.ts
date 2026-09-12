import { expect, it } from 'vitest'
import { originalSolarSource } from '../../test/original-solar'
import { validateSource } from './renderer'

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
