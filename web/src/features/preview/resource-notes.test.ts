import { expect, it } from 'vitest'
import { resourceTextClass, resourceTextSequence } from '../../test/resource-text-notes'
import { fileLinks, renderSource, validateSource } from './source-policy'

it.each([
  resourceTextSequence,
  resourceTextClass,
  '%% Reference: https://example.invalid/a\nflowchart LR\nA --> B',
  'sequenceDiagram\nparticipant A\nNote right of A: https://example.invalid/a',
  'sequenceDiagram\nparticipant A\nnote left of A: http://example.invalid',
  'classDiagram\nclass A\nnote "First\\nSecond"',
])('preserves inert notes and reference comments: %s', (source) => {
  expect(() => validateSource(source)).not.toThrow()
  expect(renderSource(source)).toBe(source.includes('classDiagram') ? source.replaceAll('\\n', '<br/>') : source)
  expect([...fileLinks(source)]).toEqual([])
})

it('projects only class-note line breaks and retains the original title, declarations and source', () => {
  const source = '---\ntitle: Note overview\n---\nclassDiagram\nclass A {\n+string name\n}\nnote for A "First\\nSecond<br/>Third"\n%% Original reference https://example.invalid\n'
  expect(renderSource(source)).toBe(source.replace('First\\nSecond', 'First<br/>Second'))
  expect(source).toContain('First\\nSecond')
})

it.each([
  '%%{init: {"theme":"https://example.invalid"}}%%\nflowchart LR\nA --> B',
  '%% {init: {"theme":"https://example.invalid"}}%%\nflowchart LR\nA --> B',
  '%% <br/>{init: {}}%%\nflowchart LR\nA --> B',
  '%% classDef a fill:url(https://example.invalid)\nflowchart LR\nA --> B',
  'sequenceDiagram\nlink A: Address @ https://example.invalid',
  'sequenceDiagram\nNote over A,B: [Address](https://example.invalid)',
  'sequenceDiagram\nNote over A,B: <a>https://example.invalid</a>',
  'sequenceDiagram\nNote over A,B: `https://example.invalid`',
  'sequenceDiagram\nNote over A,B: https://example.invalid; links A: Address',
  'sequenceDiagram\nNote over A,B: javascript:alert(1)',
  'classDiagram\nclass A\nnote for A "First\\n<img src=x>"',
  'classDiagram\nclass A\nnote for A "First\\n&#60;img"',
  'classDiagram\nclass A\nnote for A "First\\u003cimg"',
  'classDiagram\nclass A\nnote for A "First\\x3cimg"',
  'classDiagram\nclass A\nnote for A "First\\\\nSecond"',
  'classDiagram\nclass A\nnote for A "First\\njavascript:alert(1)"',
  'classDiagram\nclass A\nnote for A "First\\n![image](https://example.invalid)"',
  'classDiagram\nclass A\nnote for A "`First\\nSecond`"',
  'classDiagram\nclass A\nnote for A "First\\nSecond"; click A "https://example.invalid"',
])('refuses active syntax and other escapes around notes: %s', (source) => {
  expect(() => validateSource(source)).toThrow('plain Mermaid')
  expect(() => renderSource(source)).toThrow('plain Mermaid')
})
