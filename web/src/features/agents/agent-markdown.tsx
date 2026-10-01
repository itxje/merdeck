import type { Content, Definition, ListItem, PhrasingContent, TableCell, TableRow } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import * as React from 'react'
import { isExternalLink } from '@/features/document/document-links'
import { Button } from '@/shared/components/ui/button'

type MarkdownNode = Content | ListItem | PhrasingContent | TableRow | TableCell

function CodeBlock({ value, language }: { value: string, language: string | null | undefined }) {
  const [copiedValue, setCopiedValue] = React.useState<string | null>(null)
  const [error, setError] = React.useState(false)
  const copy = async () => {
    setCopiedValue(null)
    setError(false)
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
    }
    catch {
      setError(true)
    }
  }
  return (
    <div className="agent-code">
      <div className="agent-code-heading">
        <span>{language || 'Code'}</span>
        <Button variant="ghost" size="sm" aria-label="Copy code" onClick={() => void copy()}>{copiedValue === value ? 'Copied' : 'Copy'}</Button>
      </div>
      <pre><code>{value}</code></pre>
      {error && <span role="status">Copy failed. Select the code to copy it.</span>}
    </div>
  )
}

export function AgentMarkdown({ text }: { text: string }) {
  const tree = React.useMemo(() => fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }), [text])
  const definitions = new Map<string, Definition>()
  const collect = (nodes: MarkdownNode[]) => {
    for (const node of nodes) {
      if (node.type === 'definition' && !definitions.has(node.identifier))
        definitions.set(node.identifier, node)
      if ('children' in node)
        collect(node.children)
    }
  }
  collect(tree.children)
  const link = (url: string, children: React.ReactNode, key: string) => isExternalLink(url)
    ? <a key={key} href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>
    : <React.Fragment key={key}>{children}</React.Fragment>
  const render = (node: MarkdownNode, key: string): React.ReactNode => {
    const children = 'children' in node ? node.children.map((child, index) => render(child, `${key}-${index}`)) : null
    switch (node.type) {
      case 'text': return <React.Fragment key={key}>{node.value}</React.Fragment>
      case 'html': return <span key={key}>{node.value}</span>
      case 'paragraph': return <p key={key}>{children}</p>
      case 'heading': return React.createElement(`h${node.depth}`, { key }, children)
      case 'strong': return <strong key={key}>{children}</strong>
      case 'emphasis': return <em key={key}>{children}</em>
      case 'delete': return <del key={key}>{children}</del>
      case 'inlineCode': return <code key={key}>{node.value}</code>
      case 'code': return <CodeBlock key={key} value={node.value} language={node.lang} />
      case 'blockquote': return <blockquote key={key}>{children}</blockquote>
      case 'list': return node.ordered ? <ol key={key} start={node.start ?? undefined}>{children}</ol> : <ul key={key}>{children}</ul>
      case 'listItem': return (
        <li key={key}>
          {node.checked !== null && node.checked !== undefined && <input type="checkbox" checked={node.checked} readOnly disabled />}
          {children}
        </li>
      )
      case 'link': return link(node.url, children, key)
      case 'linkReference': {
        const definition = definitions.get(node.identifier)
        return definition ? link(definition.url, children, key) : <React.Fragment key={key}>{children}</React.Fragment>
      }
      case 'image':
      case 'imageReference': return <span key={key}>{node.alt || 'Image'}</span>
      case 'break': return <br key={key} />
      case 'thematicBreak': return <hr key={key} />
      case 'table': return (
        <div key={key} className="agent-table">
          <table>
            <thead><tr>{node.children[0]?.children.map((cell, index) => <th key={`${key}-${index}`}>{cell.children.map((child, part) => render(child, `${key}-${index}-${part}`))}</th>)}</tr></thead>
            <tbody>{node.children.slice(1).map((row, index) => render(row, `${key}-${index}`))}</tbody>
          </table>
        </div>
      )
      case 'tableRow': return <tr key={key}>{children}</tr>
      case 'tableCell': return <td key={key}>{children}</td>
      case 'footnoteReference': return <sup key={key}>{node.identifier}</sup>
      case 'footnoteDefinition': return <aside key={key}>{children}</aside>
      case 'definition': return null
      default: return null
    }
  }
  return <div className="agent-markdown">{tree.children.map((node, index) => render(node, String(index)))}</div>
}
