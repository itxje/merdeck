import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { gfm } from 'micromark-extension-gfm'

globalThis.onmessage = (event: MessageEvent<{ id: number, text: string }>) => {
  const { id, text } = event.data
  try {
    const tree = fromMarkdown(text, { extensions: [gfm(), frontmatter(['yaml'])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])] })
    globalThis.postMessage({ id, tree })
  }
  catch (error) {
    globalThis.postMessage({ id, error: error instanceof Error ? error.message : 'Markdown parsing failed.' })
  }
}
