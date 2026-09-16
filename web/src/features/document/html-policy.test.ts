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

it('drops executable and foreign subtrees and never projects file DOM attributes', () => {
  const source = `
    <base href="https://bad.example/">
    <meta http-equiv="refresh" content="0;url=https://bad.example/">
    <script>globalThis.pwned = true</script>
    <style>body { background: url(https://bad.example/style) }</style>
    <template><img src="https://bad.example/template"></template>
    <noscript><img src="https://bad.example/noscript"></noscript>
    <iframe src="https://bad.example/frame">fallback</iframe>
    <object data="https://bad.example/object">fallback</object>
    <embed src="https://bad.example/embed">
    <svg onload="pwned()"><script>pwned()</script><text>foreign</text></svg>
    <math><mtext>foreign math</mtext></math>
    <custom-element onclick="pwned()" style="background:url(https://bad.example/css)" class="danger" data-x="1" aria-label="danger">safe child</custom-element>
    <p id="safe" onclick="pwned()" style="color:red" class="danger"><span>Visible</span></p>
  `
  const result = projectHtml(source)
  const output = serialized(result)
  expect(output).toContain('safe child')
  expect(output).toContain('Visible')
  for (const forbidden of ['globalThis.pwned', 'bad.example', 'fallback', 'foreign', 'onclick', 'style', 'class', 'data-x', 'aria-label', 'custom-element', 'script', 'iframe', 'object', 'embed', 'svg', 'math'])
    expect(output).not.toContain(forbidden)
  expect(output).toContain('"sourceId":"safe"')
})

it('keeps only bounded link and source identifiers and turns resources into labelled text placeholders', () => {
  const result = projectHtml(`
    <p><a id="jump" href="next.html#part" target="_self" ping="https://bad.example/ping" onclick="pwned()">Next</a></p>
    <img src="https://bad.example/image" srcset="https://bad.example/2x 2x" alt="Chart">
    <picture><source srcset="https://bad.example/source"><img src="https://bad.example/picture"></picture>
    <video poster="https://bad.example/poster"><source src="https://bad.example/video"></video>
    <audio src="https://bad.example/audio"></audio>
  `)
  const output = serialized(result)
  expect(output).toContain('"href":"next.html#part"')
  expect(output).toContain('"sourceId":"jump"')
  expect(output).toContain('"kind":"image","label":"Chart"')
  expect(output).toContain('"kind":"media"')
  expect(output).not.toContain('bad.example')
  expect(output).not.toContain('target')
  expect(output).not.toContain('ping')
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
