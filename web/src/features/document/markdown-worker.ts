import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { gfm } from 'micromark-extension-gfm'

const deferredTextBytes = 4096

// Large prose is already retained by the document response on the main thread. Sending
// a second copy back in the parsed tree creates a long structured-clone task, so retain
// only its source range and let the React renderer read small visible chunks on demand.
function compactTree<T>(node: T): T {
  if (Array.isArray(node))
    return node.map(compactTree) as T
  if (!node || typeof node !== 'object')
    return node
  const record = node as Record<string, unknown>
  if (record.type === 'text' && typeof record.value === 'string' && record.value.length > deferredTextBytes) {
    const data = record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as Record<string, unknown> : {}
    return { ...record, value: '', data: { ...data, merdeckDeferredText: true } } as T
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
