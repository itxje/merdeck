import { describe, expect, it } from 'vitest'
import { encodedAnglePlaceholderSource } from '../../test/encoded-angle-placeholder'
import { originalFlowSource } from '../../test/original-flow'
import { sanitizeSvg, validateSource } from './renderer'
import { renderSource, restoreEncodedAnglePlaceholderText } from './source-policy'

describe('untrusted render boundary', () => {
  it.each(['<br>', '<br/>', '<br />', '<BR>', '<BR/>', '<BR />', '<bR/>'])('accepts ordinary label breaks: %s', (tag) => {
    expect(() => validateSource(`flowchart LR\nA["First${tag}Second"] -->|"Accept${tag}Continue"| B[Final]`)).not.toThrow()
  })
  it('accepts the unchanged original Unicode topology', () => {
    expect(() => validateSource(originalFlowSource)).not.toThrow()
  })
  it('restores accepted markers split across nested SVG text nodes without changing SVG structure', () => {
    const source = 'flowchart LR\nA["&lt;board&gt; + &lt;part&gt;"]'
    const markers = [...renderSource(source).matchAll(/\uE000merdeck-angle-[a-z0-9]+-[a-z0-9]+\uE001/g)].map(match => match[0])
    expect(markers).toHaveLength(2)
    const [board, slot] = markers
    const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg"><text>before ${board!.slice(0, 9)}<tspan>${board!.slice(9)} + ${slot!.slice(0, 7)}</tspan><tspan><tspan>${slot!.slice(7)}</tspan> after</tspan></text></svg>`, 'image/svg+xml')
    const textNodes = [...document.querySelectorAll('text,tspan')]
    restoreEncodedAnglePlaceholderText(document.documentElement, source)
    expect(document.querySelector('text')?.textContent).toBe('before <board> + <part> after')
    expect([...document.querySelectorAll('text,tspan')]).toEqual(textNodes)
    expect(document.querySelector('script,[onload],image')).toBeNull()
  })
  it('does not silently collide with marker-like source text', () => {
    const initial = encodedAnglePlaceholderSource
    const existing = renderSource(initial).match(/\uE000merdeck-angle-[a-z0-9]+-[a-z0-9]+\uE001/)![0]
    const source = `${initial}%% ${existing}`
    const projected = renderSource(source)
    const marker = [...projected.matchAll(/\uE000merdeck-angle-[a-z0-9]+-[a-z0-9]+\uE001/g)].map(match => match[0]).find(value => value !== existing)!
    expect(marker).not.toBe(existing)
    const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg"><text>${existing} ${marker}</text></svg>`, 'image/svg+xml')
    restoreEncodedAnglePlaceholderText(document.documentElement, source)
    expect(document.querySelector('text')?.textContent).toBe(`${existing} <board>`)
  })
  it.each([
    '<br onclick="alert(1)">',
    '<br/onload=alert(1)>',
    '<br style="color:red">',
    '<br src="/probe">',
    '<br href="/probe">',
    '<br//>',
    '<br / >',
    '<br >',
    '</br>',
    '<br\n/>',
    '<br\t/>',
    '<br\0/>',
    '&lt;br/&gt;',
    '&#60;br/&#62;',
    '#60;br/#62;',
    '<br>&lt;img src=x&gt;',
    '<br/><script>alert(1)</script>',
    '<br/><svg onload="alert(1)">',
  ])('rejects neighboring HTML or encoded forms: %s', (label) => {
    expect(() => validateSource(`flowchart LR\nA["First${label}Second"]`)).toThrow('plain Mermaid')
  })
  it.each([
    '%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\nA-->B',
    '---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\nA-->B',
    'flowchart LR\nA[<img src=x onerror=alert(1)>]',
    'flowchart LR\nA-->B\nclick A callback',
    'flowchart LR\nA@{ img: "https://example.test/track" }',
    'flowchart LR\nA-->B\nclassDef default fill:url(https://example.test/track)',
    'flowchart LR\nA[&lt;script&gt;]',
    'flowchart LR\nA[#60;script#62;]',
    'flowchart LR\nA["`![image](/diagram-resource-probe)`"]',
    'sequenceDiagram\nlink A: external @ https://example.test',
    '$$\\href{https://example.test}{x}$$',
  ])('rejects active source before Mermaid receives it: %s', (source) => {
    expect(() => validateSource(source)).toThrow('plain Mermaid')
  })
  // A `<` followed by a space or another `<` opens no tag, so these break forms are text (PREVIEW-011).
  it.each(['< br/>', '<<br/>>'])('accepts a break beside a `<` that opens no tag: %s', (label) => {
    expect(() => validateSource(`flowchart LR\nA["First${label}Second"]`)).not.toThrow()
  })
  it('bounds rendering separately from editing', () => {
    expect(() => validateSource('x'.repeat(100001))).toThrow('100,000')
    expect(() => validateSource('sequenceDiagram\nA->>B: Hello')).not.toThrow()
    expect(() => validateSource(`<br/>${'x'.repeat(99996)}`)).toThrow('100,000')
    expect(() => validateSource(`flowchart LR\nA["${'x'.repeat(99976)}<br/>B"]`)).not.toThrow()
    expect(() => validateSource('%%<br/>{init: {}}%%\nflowchart LR\nA-->B')).toThrow('plain Mermaid')
  })
  it('removes executable SVG, resources, CSS, events and external references from actual output', () => {
    const svg = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><img src="https://example.test/a" /></foreignObject><style>@import url(https://example.test/a);</style><image href="https://example.test/a"/><use href="https://example.test/a"/><a href="javascript:alert(1)"><text onclick="alert(1)">safe text</text></a><animate attributeName="href" values="javascript:alert(1)"/><path style="fill:url(https://example.test/a)" fill="url(https://example.test/a)" marker-end="url(https://example.test/a)"/><path marker-end="url(#arrow)"/></svg>`)
    const node = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(node.querySelector('script, foreignObject, style, image, use, a, animate')).toBeNull()
    expect(svg).not.toMatch(/onload|onclick|https:|javascript:|style=/)
    expect(node.querySelector('text')?.textContent).toBe('safe text')
    expect(svg).toContain('url(#arrow)')
  })
  it('refuses malformed renderer output', () => {
    expect(() => sanitizeSvg('<p>not svg</p>')).toThrow('invalid diagram')
  })
})
