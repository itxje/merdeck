import type { DiagramBlock, DiagramDocument, DiagramSelector, FileKind } from '../../shared/contracts'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { extname } from 'node:path'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { AppError } from '../../shared/errors'

interface Line {
  text: string
  start: number
  end: number
  number: number
  newline: string
}
interface Span {
  block: DiagramBlock
  start: number
  end: number
  indent: number
  fence: string
  newline: string
}
interface Parsed {
  document: DiagramDocument
  spans: Span[]
}

export function contentVersion(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function fileKind(path: string): FileKind {
  switch (extname(path)) {
    case '.mmd':
    case '.mermaid': return 'mermaid'
    case '.md': return 'markdown'
    default: throw new AppError('unsupported')
  }
}

function decode(bytes: Uint8Array): string {
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  }
  catch {
    throw new AppError('unsupported')
  }
  // eslint-disable-next-line no-control-regex -- Reject binary controls and unsupported lone carriage returns.
  if (/[\u0000-\u0008\v\f\u000E-\u001F\u007F]|\r(?!\n)/.test(source))
    throw new AppError('unsupported')
  return source
}

function* lines(bytes: Buffer): Generator<Line> {
  let number = 0
  let start = bytes.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF])) ? 3 : 0
  while (start < bytes.length) {
    const lf = bytes.indexOf(10, start)
    const end = lf === -1 ? bytes.length : lf + 1
    const crlf = lf > start && bytes[lf - 1] === 13
    yield {
      text: bytes.subarray(start, lf === -1 ? end : lf - (crlf ? 1 : 0)).toString('utf8'),
      start,
      end,
      number: ++number,
      newline: lf === -1 ? '' : crlf ? '\r\n' : '\n',
    }
    start = end
  }
}

function closes(text: string, fence: string): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(text)
  return Boolean(match?.[1] && match[1][0] === fence[0] && match[1].length >= fence.length)
}

function lineCount(bytes: Buffer): number {
  let count = 0
  for (const byte of bytes) {
    if (byte === 10)
      count++
  }
  return Math.max(1, count + (bytes.at(-1) === 10 ? 0 : 1))
}

function markdownSpans(bytes: Buffer, source: string, maxBlocks: number): Span[] {
  // Context comes from CommonMark; offsets and edited content always come from original bytes.
  const tree = fromMarkdown(source.replace(/^\uFEFF/, ''))
  const input = lines(bytes)
  let current = input.next()
  const lineAt = (number: number): Line | undefined => {
    while (!current.done && current.value.number < number)
      current = input.next()
    return !current.done && current.value.number === number ? current.value : undefined
  }
  const spans: Span[] = []
  for (const node of tree.children) {
    // Deliberately do not visit list/blockquote descendants or interpret HTML/code literals.
    if (node.type !== 'code' || node.lang !== 'mermaid' || !node.position)
      continue
    const opening = lineAt(node.position.start.line)
    const closing = lineAt(node.position.end.line)
    if (!opening || !closing || opening.number >= closing.number)
      continue
    const match = /^( {0,3})(`{3,}(?!`)|~{3,}(?!~))/.exec(opening.text)
    if (match?.[1] === undefined || !match[2] || !closes(closing.text, match[2]))
      continue
    const indent = match[1].length
    const start = opening.end
    const end = closing.start
    const raw = bytes.subarray(start, end).toString('utf8')
    // Partial tab removal is not losslessly represented by this source editor's indentation policy.
    if (indent && new RegExp(`^ {0,${indent - 1}}\\t`, 'm').test(raw))
      continue
    if (spans.length >= maxBlocks)
      throw new AppError('too_large')
    spans.push({
      start,
      end,
      indent,
      fence: match[2],
      newline: /\r?\n/.exec(raw)?.[0] ?? opening.newline,
      block: {
        selector: { kind: 'markdown', id: `md:${spans.length}:${start}:${end}` },
        label: `Diagram ${spans.length + 1}`,
        lineStart: opening.number + 1,
        lineEnd: Math.max(opening.number + 1, closing.number - 1),
        source: raw.replace(new RegExp(`^ {0,${indent}}`, 'gm'), ''),
      },
    })
  }
  return spans
}

export function parseDocument(path: string, bytes: Buffer, maxBlocks: number): Parsed {
  const source = decode(bytes)
  const kind = fileKind(path)
  const start = source.startsWith('\uFEFF') ? 3 : 0
  const spans: Span[] = kind === 'markdown'
    ? markdownSpans(bytes, source, maxBlocks)
    : [{
        start,
        end: bytes.length,
        indent: 0,
        fence: '',
        newline: /\r?\n/.exec(source)?.[0] ?? '\n',
        block: {
          selector: { kind: 'standalone' },
          label: 'Diagram',
          lineStart: 1,
          lineEnd: lineCount(bytes),
          source: bytes.subarray(start).toString('utf8'),
        },
      }]
  return { document: { path, kind, version: contentVersion(bytes), blocks: spans.map(span => span.block) }, spans }
}

export function replaceSource(path: string, bytes: Buffer, selector: DiagramSelector, source: string, maxBlocks: number, maxFileBytes: number): Buffer {
  // Encoding unpaired surrogates would silently replace user input with U+FFFD.
  if (Buffer.from(source).toString('utf8') !== source)
    throw new AppError('unsupported')
  decode(Buffer.from(source))
  const parsed = parseDocument(path, bytes, maxBlocks)
  const span = parsed.spans.find(item => item.block.selector.kind === selector.kind
    && (selector.kind === 'standalone' || (item.block.selector.kind === 'markdown' && item.block.selector.id === selector.id)))
  if (!span)
    throw new AppError('invalid_request')
  if (source === span.block.source)
    return bytes
  let replacement = source.replace(/\r?\n/g, span.newline)
  if (span.fence) {
    if (replacement && !replacement.endsWith('\n'))
      replacement += span.newline
    replacement = replacement.replace(/^(?=.)/gm, ' '.repeat(span.indent))
    if (replacement.split(/\r?\n/).some(line => closes(line, span.fence)))
      throw new AppError('unsupported')
  }
  const result = Buffer.concat([bytes.subarray(0, span.start), Buffer.from(replacement), bytes.subarray(span.end)])
  if (result.length > maxFileBytes)
    throw new AppError('too_large')
  // Reparse the exact new bytes before touching the destination.
  parseDocument(path, result, maxBlocks)
  return result
}
