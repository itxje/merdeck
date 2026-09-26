import { expect, it } from 'vitest'
import { projectHtml } from './html-policy'

function serialized(value: unknown) {
  return JSON.stringify(value)
}

it('projects malformed HTML and decoded entities into a semantic inert tree', () => {
  const result = projectHtml('<!doctype html><h1 id="top">Title &amp; more<p>Text <b>bold <i>and italic</h1><table><tr><th>A<td>B</table>')
  expect(result.truncated).toBe(false)
  expect(result.children).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'element', tag: 'h1', sourceId: 'top' }),
    expect.objectContaining({ type: 'element', tag: 'table' }),
  ]))
  expect(serialized(result)).toContain('Title & more')
  expect(serialized(result)).toContain('strong')
  expect(serialized(result)).toContain('em')
  expect(serialized(result)).toContain('tbody')
})

it('drops executable and foreign subtrees and never projects dangerous attributes', () => {
  const source = `
    <base href="https://bad.example/">
    <meta http-equiv="refresh" content="0;url=https://bad.example/">
    <script>globalThis.pwned = true</script>
    <template><img src="https://bad.example/template"></template>
    <noscript><img src="https://bad.example/noscript"></noscript>
    <iframe src="https://bad.example/frame">fallback</iframe>
    <object data="https://bad.example/object">fallback</object>
    <embed src="https://bad.example/embed">
    <svg onload="pwned()"><script>pwned()</script><text>foreign</text></svg>
    <math><mtext>foreign math</mtext></math>
    <custom-element onclick="pwned()" style="background:url(https://bad.example/css)" class="danger" data-x="1" aria-label="danger">safe child</custom-element>
    <p id="safe" onclick="pwned()" class="danger"><span>Visible</span></p>
  `
  const result = projectHtml(source)
  const output = serialized(result)
  expect(output).toContain('safe child')
  expect(output).toContain('Visible')
  for (const forbidden of ['globalThis.pwned', 'bad.example', 'fallback', 'foreign', 'onclick', 'class', 'data-x', 'aria-label', 'custom-element', 'script', 'iframe', 'object', 'embed', 'svg', 'math'])
    expect(output).not.toContain(forbidden)
  expect(output).toContain('"sourceId":"safe"')
})

it('supports scoped style elements and safe inline style properties', () => {
  const source = `
    <style>body { font-family: sans-serif; } h1, h2 { color: blue; } @import "bad.css";</style>
    <p style="color: red; font-weight: bold; expression: alert(1); invalid: ;">Styled text</p>
  `
  const result = projectHtml(source)
  const output = serialized(result)
  expect(output).toContain('.html-document-view { font-family: sans-serif; }')
  expect(output).toContain('.html-document-view h1, .html-document-view h2 { color: blue; }')
  expect(output).not.toContain('bad.css')
  expect(output).not.toContain('@import')
  expect(output).toContain('"style":{"color":"red","fontWeight":"bold"}')
})

it('keeps only bounded link and source identifiers and projects images and media elements', () => {
  const result = projectHtml(`
    <p><a id="jump" href="next.html#part" target="_self" ping="https://bad.example/ping" onclick="pwned()">Next</a></p>
    <img src="https://example.test/image.png" alt="Chart" width="200" height="100">
    <picture><source src="https://example.test/pic.png"><img src="https://example.test/fallback.png"></picture>
    <video src="https://example.test/video.mp4"><source src="https://example.test/video.webm" type="video/webm"></video>
    <audio src="https://example.test/audio.mp3"></audio>
  `)
  const output = serialized(result)
  expect(output).toContain('"href":"next.html#part"')
  expect(output).toContain('"sourceId":"jump"')
  expect(output).toContain('"tag":"img"')
  expect(output).toContain('"src":"https://example.test/image.png"')
  expect(output).toContain('"alt":"Chart"')
  expect(output).toContain('"tag":"picture"')
  expect(output).toContain('"tag":"video"')
  expect(output).toContain('"tag":"audio"')
  expect(output).toContain('"tag":"source"')
  expect(output).not.toContain('ping')
  expect(output).not.toContain('target')
  expect(output).not.toContain('onclick')
})

it('unwraps form labels as text while creating no interactive controls', () => {
  const result = projectHtml('<form action="https://bad.example/"><label>Name <input autofocus name="x"></label><button formaction="https://bad.example/">Submit</button><select><option>One</option></select><textarea>Notes</textarea></form>')
  const output = serialized(result)
  expect(output).toContain('Name ')
  expect(output).toContain('Submit')
  expect(output).toContain('One')
  expect(output).toContain('Notes')
  for (const forbidden of ['form', 'input', 'button', 'select', 'option', 'textarea', 'bad.example'])
    expect(output).not.toContain(`"tag":"${forbidden}"`)
})

it('bounds depth, node count, text and URL materialization with a visible truncation signal', () => {
  const source = `<div>${'<span>x</span>'.repeat(20)}</div><p>${'y'.repeat(100)}</p><a href="${'z'.repeat(100)}">link</a>`
  const result = projectHtml(source, { maxDepth: 2, maxNodes: 8, maxTextCharacters: 10, maxUrlCharacters: 8 })
  expect(result.truncated).toBe(true)
  expect(result.stats.visitedNodes).toBeLessThanOrEqual(8)
  expect(result.stats.textCharacters).toBeLessThanOrEqual(10)
  expect(serialized(result)).not.toContain('"href"')
})

it('preserves semantic layout containers with source identifiers', () => {
  const source = '<nav id="toc"><ul id="list"><li><a href="#intro">Intro</a></li></ul></nav><main id="content"><article><section>Text</section></article></main>'
  const result = projectHtml(source)
  expect(result.children).toEqual([
    expect.objectContaining({ type: 'element', tag: 'nav', sourceId: 'toc' }),
    expect.objectContaining({ type: 'element', tag: 'main', sourceId: 'content' }),
  ])
})

it('admits embedded SVG images beyond the ordinary URL limit with a separate 1 MiB bound', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><!--${'diagram '.repeat(600)}--><text x="10" y="50">Diagram</text></svg>`
  const src = `data:image/svg+xml;base64,${btoa(svg)}`
  expect(src.length).toBeGreaterThan(2048)
  const image = (url: string) => projectHtml(`<img src="${url}" alt="Diagram">`).children[0]
  expect(image(src)).toMatchObject({ tag: 'img', src, alt: 'Diagram' })

  const prefix = 'data:image/png;base64,'
  const atLimit = prefix + 'A'.repeat(1024 * 1024 - prefix.length)
  expect(image(atLimit)).toHaveProperty('src', atLimit)
  expect(image(`${atLimit}A`)).not.toHaveProperty('src')
})

it('keeps ordinary URLs, other media and dangerous schemes under the existing restrictions', () => {
  const network = `https://example.test/${'a'.repeat(2048)}`
  const dataImage = `data:image/png;base64,${'A'.repeat(4096)}`
  const refused = [
    `<img src="${network}">`,
    `<a href="${network}">Long link</a>`,
    `<a href="${dataImage}">Image link</a>`,
    `<audio src="${dataImage}"></audio>`,
    `<video src="${dataImage}"></video>`,
    `<source src="${dataImage}">`,
    `<img src="data:audio/wav;base64,${'A'.repeat(4096)}">`,
    '<img src="javascript:alert(1)">',
    '<img src="vbscript:alert(1)">',
    '<img src="data:text/html;base64,PHNjcmlwdD4=">',
    '<img src="data:image/png;base64,AAAA&#10;AAAA">',
  ]
  for (const source of refused) {
    const node = projectHtml(source).children[0]
    expect(node).not.toHaveProperty('src')
    expect(node).not.toHaveProperty('href')
  }
  const atLimit = network.slice(0, 2048)
  expect(projectHtml(`<img src="${atLimit}">`).children[0]).toHaveProperty('src', atLimit)
  expect(projectHtml('<img src="data:image/png;base64,AAAA">', { maxUrlCharacters: 8 }).children[0]).toHaveProperty('src')
})
