import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { gfm } from 'micromark-extension-gfm'

const deferredTextBytes = 4096

// Preserve MDAST's decoded text values while putting large prose into bounded runs for
// progressive React materialization. Source offsets cannot substitute for values: they
// still contain Markdown escapes and character references.
function textChunks(value: string): string[] {
  const chunks: string[] = []
  for (let start = 0; start < value.length;) {
    let end = Math.min(value.length, start + deferredTextBytes)
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1]!) && /[\uDC00-\uDFFF]/.test(value[end]!))
      end--
    chunks.push(value.slice(start, end))
    start = end
  }
  return chunks
}

function compactTree<T>(node: T): T {
  if (Array.isArray(node))
    return node.map(compactTree) as T
  if (!node || typeof node !== 'object')
    return node
  const record = node as Record<string, unknown>
  if (record.type === 'text' && typeof record.value === 'string' && record.value.length > deferredTextBytes) {
    const data = record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as Record<string, unknown> : {}
    return { ...record, value: '', data: { ...data, merdeckTextChunks: textChunks(record.value) } } as T
  }
  if (Array.isArray(record.children))
    return { ...record, children: record.children.map(compactTree) } as T
  return node
}

globalThis.onmessage = (event: MessageEvent<{ id: number, text: string }>) => {
  const { id, text } = event.data
  try {
    const started = performance.now()
    const tree = fromMarkdown(text, { extensions: [gfm(), frontmatter(['yaml'])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])] })
    const parsed = performance.now()
    const compact = compactTree(tree)
    globalThis.postMessage({ id, tree: compact, timing: { parseMs: parsed - started, compactMs: performance.now() - parsed } })
  }
  catch (error) {
    globalThis.postMessage({ id, error: error instanceof Error ? error.message : 'Markdown parsing failed.' })
  }
}
