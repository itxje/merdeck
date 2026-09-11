import { Buffer } from 'node:buffer'
import { describe, expect, test } from 'bun:test'
import { contentVersion, fileKind, parseDocument, replaceSource } from './parser'

const parse = (text: string, path = 'test.md', limit = 100) => parseDocument(path, Buffer.from(text), limit)

describe('lossless diagram parsing', () => {
  test('selects independent byte spans across BOM, Unicode, CRLF and fence variants', () => {
    const prefix = '\uFEFF# Project π\r\n\r\n````typescript\r\n```mermaid\r\nnot a diagram\r\n```\r\n````\r\n'
    const first = '  ~~~~mermaid title\r\n  graph TD\r\n    A --> B\r\n ~~~~~ \t\r\n'
    const middle = '\r\nUnchanged λ\r\n'
    const second = '```mermaid\r\nsequenceDiagram\r\n  Alice->>Bob: Hi\r\n```'
    const original = Buffer.from(prefix + first + middle + second)
    const document = parseDocument('test.md', original, 100).document
    expect(document.blocks).toHaveLength(2)
    expect(document.blocks[0]?.source).toBe('graph TD\r\n  A --> B\r\n')
    const block = document.blocks[0]!
    expect(block.selector).toEqual({ kind: 'markdown', id: `md:0:${Buffer.byteLength(`${prefix}  ~~~~mermaid title\r\n`)}:${Buffer.byteLength(`${prefix}  ~~~~mermaid title\r\n  graph TD\r\n    A --> B\r\n`)}` })
    const updated = replaceSource('test.md', original, block.selector, 'graph LR\n  X --> Y', 100, 4096)
    expect(updated.equals(Buffer.from(`${prefix}  ~~~~mermaid title\r\n  graph LR\r\n    X --> Y\r\n ~~~~~ \t\r\n${middle}${second}`))).toBe(true)
    const next = parseDocument('test.md', updated, 100).document
    expect(next.blocks[1]?.source).toBe(document.blocks[1]?.source ?? '')
    expect(next.version).not.toBe(document.version)
    expect(contentVersion(original)).toBe(document.version)
  })

  test('preserves each untouched byte when the second block changes', () => {
    const text = '# Test\n```mermaid\ngraph TD\n```\n\n~~~mermaid\nold\n~~~\nTail'
    const document = parse(text).document
    const changed = replaceSource('test.md', Buffer.from(text), document.blocks[1]!.selector, 'new', 100, 2048)
    expect(changed.toString()).toBe(text.replace('old\n', 'new\n'))
  })

  test('no-op source retains irregular indentation and mixed newlines exactly', () => {
    const text = '   ```mermaid\r\ngraph TD\n A-->B\r\n  C-->D\n   ```\n'
    const parsed = parse(text)
    expect(replaceSource('test.md', Buffer.from(text), parsed.document.blocks[0]!.selector, parsed.document.blocks[0]!.source, 100, 2048).toString()).toBe(text)
  })

  test('standalone preserves BOM and original newline convention', () => {
    const document = parse('\uFEFFgraph TD\r\nA-->B', 'test.mermaid').document
    expect(document.blocks[0]?.source).toBe('graph TD\r\nA-->B')
    expect(replaceSource('test.mermaid', Buffer.from('\uFEFFgraph TD\r\nA-->B'), { kind: 'standalone' }, 'graph LR\nX-->Y', 10, 2048).toString()).toBe('\uFEFFgraph LR\r\nX-->Y')
    expect(parse('', 'test.mmd').document.blocks[0]?.lineEnd).toBe(1)
  })

  test('non-Mermaid fences suppress inner fences, including unclosed ordinary code', () => {
    expect(parse('````js\n```mermaid\nx\n```\n````\n').document.blocks).toEqual([])
    expect(parse('~~~text\n```mermaid\nx\n```').document.blocks).toEqual([])
    expect(parse('```mermaid`invalid\nText').document.blocks).toEqual([])
    expect(parse('```Mermaid\nx\n```').document.blocks).toEqual([])
  })

  test('supports empty blocks, longer closers and whitespace info', () => {
    const document = parse(' ~~~ mermaid title\n ~~~~~\n```mermaid\n```\n').document
    expect(document.blocks).toHaveLength(2)
    expect(document.blocks[0]?.lineStart).toBe(2)
    expect(document.blocks[0]?.lineEnd).toBe(2)
    expect(document.blocks.map(block => block.source)).toEqual(['', ''])
    expect(fileKind('a.mmd')).toBe('mermaid')
    expect(fileKind('a.md')).toBe('markdown')
    expect(() => fileKind('a.txt')).toThrow('cannot be edited')
  })

  test.each(['x\ry', 'x\0y'])('rejects invalid document text %j', (text) => {
    expect(() => parse(text)).toThrow('cannot be edited')
  })

  test('rejects invalid UTF-8, binary controls and too many blocks', () => {
    expect(() => parseDocument('a.mmd', Buffer.from([0xFF]), 100)).toThrow('cannot be edited')
    expect(() => parse('```mermaid\nx\n```\n~~~mermaid\ny\n~~~', 'a.md', 1)).toThrow('size limit')
  })

  test('uses CommonMark context for incomplete references and skips ambiguous individual blocks', () => {
    // An incomplete reference label is a paragraph; the following fence interrupts it.
    expect(parse('[label\n```mermaid\nx\n```\n]: /url').document.blocks[0]?.source).toBe('x\n')
    const source = '  ```mermaid\n\tgraph TD\n  ```\n\n```mermaid\nvalid\n```\n\n```mermaid\nunclosed'
    expect(parse(source).document.blocks.map(block => block.source)).toEqual(['valid\n'])
    expect(parse('```mermaid').document.blocks).toEqual([])
    expect(parse('```mermaid\nx\n').document.blocks).toEqual([])
  })

  test('rejects delimiter injection, missing selectors, malformed source and large replacements', () => {
    const text = '```mermaid\nx\n```\nKeep'
    const selector = parse(text).document.blocks[0]!.selector
    for (const source of ['```\nOther', ' `````\nOther', '\uD800', 'x\0y'])
      expect(() => replaceSource('test.md', Buffer.from(text), selector, source, 10, 2048)).toThrow('cannot be edited')
    expect(() => replaceSource('test.md', Buffer.from(text), { kind: 'standalone' }, 'x', 10, 2048)).toThrow('request is invalid')
    expect(() => replaceSource('test.md', Buffer.from(text), { kind: 'markdown', id: 'md:5:0:1' }, 'x', 10, 2048)).toThrow('request is invalid')
    expect(() => replaceSource('test.md', Buffer.from(text), selector, 'x'.repeat(3000), 10, 2048)).toThrow('size limit')
  })
})

describe('CommonMark block context', () => {
  const visible = '```mermaid\nvisible\n```'
  const ordinary = [
    ['bullet list', '- First item\n- Second item'],
    ['ordered list', '1. First item\n2. Second item'],
    ['blockquote', '> Ordinary quotation\n> with a second line'],
    ['inline links', '[Project guide](./guide.md) and [reference][guide].'],
    ['reference definitions', '[guide]: ./guide.md "Project guide"'],
    ['HTML section', '<section>\n<p>Ordinary HTML</p>\n</section>'],
    ['indented code', '    ordinary code\n    still ordinary code'],
  ]

  test.each(ordinary)('retains a top-level diagram after ordinary %s', (_name, context) => {
    const text = `${context}\n\n${visible}\n\n${context}\n`
    const document = parse(text).document
    expect(document.blocks.map(block => block.source)).toEqual(['visible\n'])
    const changed = replaceSource('test.md', Buffer.from(text), document.blocks[0]!.selector, 'changed', 100, 4096)
    expect(changed.toString()).toBe(text.replace('\nvisible\n', '\nchanged\n'))
  })

  const literals = [
    ['ordinary fenced code', '````typescript\n```mermaid\nhidden\n```\n````'],
    ['tilde fenced code', '~~~~text\n```mermaid\nhidden\n```\n~~~~'],
    ['indented code', '    ```mermaid\n    hidden\n    ```'],
    ['tab-indented code', '\t```mermaid\n\thidden\n\t```'],
    ['bullet container', '- Item\n\n  ```mermaid\n  hidden\n  ```'],
    ['ordered container', '1. Item\n\n   ~~~mermaid\n   hidden\n   ~~~'],
    ['blockquote container', '> ```mermaid\n> hidden\n> ```'],
    ['nested quote and list', '> - Item\n>\n>   ```mermaid\n>   hidden\n>   ```'],
    ['raw script HTML', '<script>\n```mermaid\nhidden\n```\n</script>'],
    ['raw block HTML', '<div>\n```mermaid\nhidden\n```\n</div>'],
    ['raw custom HTML', '<custom-element>\n```mermaid\nhidden\n```\n</custom-element>'],
    ['HTML comment', '<!--\n```mermaid\nhidden\n```\n-->'],
    ['HTML processing instruction', '<?processing\n```mermaid\nhidden\n```\n?>'],
    ['HTML CDATA', '<![CDATA[\n```mermaid\nhidden\n```\n]]>'],
    ['reference title', '[ref]: /url\n    "title\n    ```mermaid\n    hidden\n    ```\n    end"'],
  ]

  test.each(literals)('does not select Mermaid-looking text inside %s', (_name, context) => {
    const text = `${context}\n\n${visible}`
    const document = parse(text).document
    expect(document.blocks.map(block => block.source)).toEqual(['visible\n'])
    const changed = replaceSource('test.md', Buffer.from(text), document.blocks[0]!.selector, 'changed', 100, 4096)
    expect(changed.toString()).toBe(`${context}\n\n${visible.replace('visible', 'changed')}`)
  })

  test('respects blank-line HTML termination and CommonMark list continuation', () => {
    expect(parse('<div>\n</div>\n```mermaid\nhidden\n```').document.blocks).toEqual([])
    expect(parse('- item\n\n  ```mermaid\n  nested\n  ```').document.blocks).toEqual([])
    expect(parse(`> quoted\n${visible}`).document.blocks[0]?.source).toBe('visible\n')
  })

  test('maintains independently selectable byte spans amidst ordinary constructs', () => {
    const prefix = '\uFEFF# Guide π 😀\r\n\r\n- bullet\r\n\r\n[guide](guide.md)\r\n\r\n'
    const first = '```mermaid\r\nfirst π\r\n```\r\n'
    const middle = '\r\n> quote\r\n\r\n<div>\r\n```mermaid\r\nhidden\r\n```\r\n</div>\r\n\r\n1. ordered\r\n\r\n'
    const second = '~~~mermaid\r\nsecond 😀\r\n~~~'
    const original = Buffer.from(prefix + first + middle + second)
    const document = parseDocument('guide.md', original, 100).document
    expect(document.blocks.map(block => block.source)).toEqual(['first π\r\n', 'second 😀\r\n'])
    expect(document.blocks[1]?.selector).toEqual({ kind: 'markdown', id: `md:1:${Buffer.byteLength(`${prefix}${first}${middle}~~~mermaid\r\n`)}:${Buffer.byteLength(`${prefix}${first}${middle}~~~mermaid\r\nsecond 😀\r\n`)}` })
    expect(replaceSource('guide.md', original, document.blocks[1]!.selector, 'changed λ', 100, 8192).toString()).toBe(`${prefix}${first}${middle}~~~mermaid\r\nchanged λ\r\n~~~`)
  })
})
