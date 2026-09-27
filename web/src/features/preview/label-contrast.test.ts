import { expect, it } from 'vitest'
import { readableNodeLabels } from './renderer'

it('changes node label colours only where they would be unreadable on the node fill', () => {
  const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">
    <g class="node"><rect class="basic label-container" fill="rgb(255, 248, 225)"/><g class="label"><rect class="background" fill="rgb(255, 248, 225)"/><text fill="rgb(250, 250, 250)"><tspan fill="rgb(250, 250, 250)">Pastel</tspan></text></g></g>
    <g class="node"><g class="basic label-container"><path fill="rgb(30, 30, 30)"/></g><g class="label"><text fill="rgb(10, 10, 10)">Dark fill</text></g></g>
    <g class="node"><rect fill="rgb(245, 245, 245)"/><g class="label"><text fill="rgb(23, 23, 23)">Readable</text></g></g>
    <g class="node"><rect fill="none"/><rect fill="rgb(255, 255, 255)" fill-opacity="0.2"/><g class="label"><text fill="rgb(250, 250, 250)">No solid fill</text></g></g>
    <g class="edgeLabel"><rect fill="rgb(255, 255, 255)"/><text fill="rgb(250, 250, 250)">Edge</text></g>
  </svg>`, 'image/svg+xml').documentElement
  readableNodeLabels(svg)
  expect([...svg.querySelectorAll('text, tspan')].map(element => [element.textContent, element.getAttribute('fill')])).toEqual([
    ['Pastel', 'rgb(23, 23, 23)'],
    ['Pastel', 'rgb(23, 23, 23)'],
    ['Dark fill', 'rgb(250, 250, 250)'],
    ['Readable', 'rgb(23, 23, 23)'],
    ['No solid fill', 'rgb(250, 250, 250)'],
    ['Edge', 'rgb(250, 250, 250)'],
  ])
})
