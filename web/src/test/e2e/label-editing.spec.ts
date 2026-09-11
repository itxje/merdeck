import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('flowchart node labels are located in the source and edited on the diagram', async ({ page }) => {
  test.setTimeout(90000)
  const name = `label-editing-${randomUUID()}.mmd`
  const path = join(root, name)
  const initial = 'flowchart LR\n  Start[Start here] --> Finish["Finish (done)"]\n  Finish --> Extra\n'
  const edited = 'flowchart LR\n  Start[Begin now] --> Finish["Finish (done)"]\n  Finish --> Extra[Extra step]\n'
  await writeFile(path, initial, { flag: 'wx' })
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'PUT')
      writes.push(request.postData() ?? '')
  })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await choose(page, name)
    await live(page)
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const surface = page.getByRole('region', { name: 'Scrollable diagram canvas' })
    const label = page.getByRole('textbox', { name: 'Node label', exact: true })
    const node = (id: string) => page.locator(`.diagram-graphic g.node[id*="-flowchart-${id}-"]`)
    await expect(surface).toHaveAttribute('data-editable', 'ready')

    await node('Start').click()
    await expect(editor).toBeFocused()
    expect(await editor.evaluate(element => (element as HTMLTextAreaElement).value.slice((element as HTMLTextAreaElement).selectionStart, (element as HTMLTextAreaElement).selectionEnd))).toBe('Start here')

    await node('Start').dblclick()
    await expect(label).toBeFocused()
    await expect(label).toHaveValue('Start here')
    await label.fill('Begin now')
    await label.press('Enter')
    await expect(label).toBeHidden()
    await expect(editor).toHaveValue(initial.replace('Start here', 'Begin now'))
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()
    await expect(node('Start')).toContainText('Begin now')
    await expect(surface).toHaveAttribute('data-editable', 'ready')

    await node('Extra').dblclick()
    await expect(label).toHaveValue('Extra')
    await label.fill('Extra step')
    await label.press('Enter')
    await expect(editor).toHaveValue(edited)
    await expect(node('Extra')).toContainText('Extra step')
    await expect(surface).toHaveAttribute('data-editable', 'ready')

    await node('Finish').dblclick()
    await expect(label).toHaveValue('Finish (done)')
    await label.fill('Say "hi"')
    await label.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'double quotes' })).toBeVisible()
    await label.press('Escape')
    await expect(label).toBeHidden()
    await expect(editor).toHaveValue(edited)
    expect(writes).toHaveLength(0)
    expect(await readFile(path, 'utf8')).toBe(initial)

    const response = page.waitForResponse(item => item.request().method() === 'PUT')
    await page.getByRole('button', { name: /^Save/ }).click()
    expect((await response).status()).toBe(200)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    expect(JSON.parse(writes[0]!)).toMatchObject({ path: name, source: edited })
    expect(await readFile(path, 'utf8')).toBe(edited)
  }
  finally { await rm(path) }
})
