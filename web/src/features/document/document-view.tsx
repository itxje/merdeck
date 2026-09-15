import type { DiagramBlock } from '../../../../src/shared/contracts'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import * as React from 'react'
import { renderDiagram } from '@/features/preview/renderer'
import { parentDirectory, validPath } from '@/features/workspace/api'

interface Node { type: string, value?: string, lang?: string | null, url?: string, alt?: string | null, depth?: number, checked?: boolean | null, ordered?: boolean, align?: (string | null)[], children?: Node[], position?: { start: { line: number }, end: { line: number } } }

function parse(text: string) {
  return fromMarkdown(text, { extensions: [gfm(), frontmatter(['yaml'])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])] }) as unknown as { children: Node[] }
}

function useDocumentTree(text: string) {
  const [tree, setTree] = React.useState(() => parse(text))
  React.useEffect(() => {
    if (typeof Worker === 'undefined') {
      setTree(parse(text))
      return
    }
    const worker = new Worker(new URL('./markdown-worker.ts', import.meta.url), { type: 'module' })
    let current = true
    const id = 1
    worker.onmessage = (event: MessageEvent<{ id: number, tree?: { children: Node[] } }>) => {
      if (current && event.data.id === id && event.data.tree)
        setTree(event.data.tree)
    }
    worker.postMessage({ id, text })
    return () => {
      current = false
      worker.terminate()
    }
  }, [text])
  return tree
}

function InlineDiagram({ source, selected, onSelect }: { source: string, selected: boolean, onSelect: () => void }) {
  const [result, setResult] = React.useState<{ source: string, svg: string } | { source: string, error: string } | null>(null)
  React.useEffect(() => {
    let current = true
    void renderDiagram(source, () => current).then((svg) => {
      if (current && svg)
        setResult({ source, svg })
    }, (error) => {
      if (current)
        setResult({ source, error: error instanceof Error ? error.message : 'Unable to render diagram.' })
    })
    return () => {
      current = false
    }
  }, [source])
  const visible = result?.source === source ? result : null
  return (
    <figure className={`document-diagram${selected ? ' selected' : ''}`} onClick={onSelect}>
      {visible && 'svg' in visible ? <div className="diagram-graphic" dangerouslySetInnerHTML={{ __html: visible.svg }} /> : visible ? <figcaption role="alert">{visible.error}</figcaption> : <figcaption>Rendering diagram…</figcaption>}
    </figure>
  )
}

function resolveProjectLink(path: string, url: string): string | null {
  if (!/^(?:[^:/?#]+\/)*[^/?#]+\.(?:md|mmd|mermaid)(?:#.*)?$/i.test(url))
    return null
  const target = decodeURIComponent(url.split('#', 1)[0] ?? '')
  const parts = [...parentDirectory(path).split('/').filter(Boolean), ...target.split('/')]
  const normalized: string[] = []
  for (const part of parts) {
    if (part === '.' || !part)
      continue
    if (part === '..')
      normalized.pop()
    else
      normalized.push(part)
  }
  const result = normalized.join('/')
  return validPath(result) ? result : null
}

export function DocumentView({ text, path, blocks, sources, selected, onSelect, onOpenFile }: { text: string, path: string, blocks: DiagramBlock[], sources: string[], selected: number, onSelect: (index: number) => void, onOpenFile: (path: string) => void }) {
  const tree = useDocumentTree(text)
  const matched = React.useMemo(() => new Map(blocks.map((block, index) => [`${block.lineStart - 1}:${block.lineEnd + 1}`, index])), [blocks])
  const placementOk = blocks.every(block => tree.children.some(node => node.type === 'code' && node.lang === 'mermaid' && node.position && `${node.position.start.line}:${node.position.end.line}` === `${block.lineStart - 1}:${block.lineEnd + 1}`))
  // eslint-disable-next-line ts/no-use-before-define -- The renderer and its child recursion are intentionally paired.
  const renderChildren = (children: Node[] | undefined): React.ReactNode => children?.map((node, index) => render(node, `${node.type}-${index}`))
  const render = (node: Node, key: string): React.ReactNode => {
    const children = renderChildren(node.children)
    if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'html')
      return node.value
    if (node.type === 'paragraph')
      return <p key={key}>{children}</p>
    if (node.type === 'heading')
      return React.createElement(`h${Math.min(6, node.depth ?? 1)}`, { key }, children)
    if (node.type === 'emphasis')
      return <em key={key}>{children}</em>
    if (node.type === 'strong')
      return <strong key={key}>{children}</strong>
    if (node.type === 'delete')
      return <del key={key}>{children}</del>
    if (node.type === 'blockquote')
      return <blockquote key={key}>{children}</blockquote>
    if (node.type === 'thematicBreak')
      return <hr key={key} />
    if (node.type === 'break')
      return <br key={key} />
    if (node.type === 'list')
      return node.ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
    if (node.type === 'listItem') {
      return (
        <li key={key}>
          {node.checked !== null && node.checked !== undefined && <input type="checkbox" checked={node.checked} readOnly tabIndex={-1} />}
          {children}
        </li>
      )
    }
    if (node.type === 'image') {
      return (
        <span key={key} className="document-image">
          Image:
          {node.alt || 'image'}
          {' '}
          (
          {node.url}
          )
        </span>
      )
    }
    if (node.type === 'link') {
      const project = node.url ? resolveProjectLink(path, node.url) : null
      if (project)
        return <button key={key} type="button" className="document-link" onClick={() => onOpenFile(project)}>{children}</button>
      if (node.url && /^(?:https?:|mailto:)/i.test(node.url))
        return <a key={key} href={node.url} target="_blank" rel="noopener noreferrer">{children}</a>
      return <React.Fragment key={key}>{children}</React.Fragment>
    }
    if (node.type === 'code') {
      const found = node.position ? matched.get(`${node.position.start.line}:${node.position.end.line}`) : undefined
      if (placementOk && node.lang === 'mermaid' && found !== undefined)
        return <InlineDiagram key={key} source={sources[found] ?? blocks[found]!.source} selected={selected === found} onSelect={() => onSelect(found)} />
      return <pre key={key}><code>{node.value}</code></pre>
    }
    if (node.type === 'table')
      return <table key={key}><tbody>{children}</tbody></table>
    if (node.type === 'tableRow')
      return <tr key={key}>{children}</tr>
    if (node.type === 'tableCell')
      return <td key={key}>{children}</td>
    if (node.type === 'footnoteDefinition')
      return <aside key={key}>{children}</aside>
    return <React.Fragment key={key}>{children}</React.Fragment>
  }
  return (
    <article className="document-view" aria-label="Markdown document">
      {!placementOk && <p className="document-mismatch" role="alert">Diagram placement could not be verified; Mermaid fences are shown as code.</p>}
      {tree.children.map((node, index) => render(node, `root-${index}`))}
    </article>
  )
}
