import { randomUUID } from 'node:crypto'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
const tokenFile = process.env.MERDECK_SMOKE_TOKEN_FILE
if (!root || !tokenFile)
  throw new Error('An explicit disposable sample root and private token file are required')
const template = 'flowchart TD\n  A[Start] --> B[End]\n'

test('the explorer creates, renames, moves and deletes files and folders inside the project', async ({ page, audit }) => {
  test.setTimeout(90000)
  audit.allowHttp(409, '/api/diagrams/entries')
  audit.allowHttp(409, '/api/diagrams/entries/delete')
  const folder = `manage-${randomUUID().slice(0, 8)}`
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    const dialog = page.getByRole('dialog')
    const pathInput = dialog.getByLabel('Path', { exact: true })
    const editor = page.getByLabel('Mermaid source', { exact: true })

    await explorer.getByRole('button', { name: 'New folder', exact: true }).click()
    await expect(pathInput).toHaveValue('new-folder')
    await pathInput.fill(folder)
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(explorer.getByRole('button', { name: folder, exact: true })).toBeVisible()

    // A new file starts from the example diagram and opens immediately.
    await explorer.getByRole('button', { name: `Actions for ${folder}`, exact: true }).click()
    await page.getByRole('menuitem', { name: 'New file here…' }).click()
    await expect(pathInput).toHaveValue(`${folder}/untitled.mmd`)
    expect(await pathInput.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0))).toBe('untitled')
    await pathInput.fill(`${folder}/flow.mmd`)
    await page.keyboard.press('Enter')
    await expect(dialog).toHaveCount(0)
    await expect(editor).toHaveValue(template)
    await live(page)
    expect(await readFile(join(root, folder, 'flow.mmd'), 'utf8')).toBe(template)

    await explorer.getByRole('button', { name: 'New file', exact: true }).click()
    await expect(pathInput).toHaveValue(`${folder}/untitled.mmd`)
    await pathInput.fill(`${folder}/flow.mmd`)
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('An entry with that name already exists. Choose another name.')
    await pathInput.fill(`${folder}/.hidden.mmd`)
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Names that start with a dot are hidden and cannot be used.')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // An unsaved draft follows its renamed file and can still be saved there.
    const draft = 'flowchart TD\n  A[Start] --> B[Renamed draft]\n'
    await editor.fill(draft)
    await explorer.getByRole('button', { name: /^flow\.mmd/ }).focus()
    await page.keyboard.press('F2')
    await expect(pathInput).toHaveValue(`${folder}/flow.mmd`)
    await pathInput.fill(`${folder}/renamed.mmd`)
    await dialog.getByRole('button', { name: 'Move', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(explorer.getByRole('button', { name: /^renamed\.mmd/ })).toHaveAttribute('aria-current', 'true')
    await expect(editor).toHaveValue(draft)
    expect(await readdir(join(root, folder))).toEqual(['renamed.mmd'])
    await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(await readFile(join(root, folder, 'renamed.mmd'), 'utf8')).toBe(draft)

    await explorer.getByRole('button', { name: 'New folder', exact: true }).click()
    await pathInput.fill(`${folder}/nested`)
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(explorer.getByRole('button', { name: 'nested', exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: /^renamed\.mmd/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Rename or move…' }).click()
    await pathInput.fill(`${folder}/nested/renamed.mmd`)
    await dialog.getByRole('button', { name: 'Move', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(explorer.getByRole('button', { name: /^renamed\.mmd/ })).toHaveAttribute('aria-current', 'true')
    expect(await readFile(join(root, folder, 'nested', 'renamed.mmd'), 'utf8')).toBe(draft)

    // A folder with visible contents cannot be deleted from its menu.
    await explorer.getByRole('button', { name: 'nested', exact: true }).click({ button: 'right' })
    await expect(page.getByRole('menuitem', { name: 'Delete…' })).toBeDisabled()
    await page.keyboard.press('Escape')

    await explorer.getByRole('button', { name: /^renamed\.mmd/ }).focus()
    await page.keyboard.press('Delete')
    await expect(dialog).toContainText(`Permanently delete ${folder}/nested/renamed.mmd`)
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Choose a diagram', exact: true })).toBeVisible()
    await expect(explorer.getByRole('button', { name: /^renamed\.mmd/ })).toHaveCount(0)
    expect(await readdir(join(root, folder, 'nested'))).toEqual([])

    // Files the explorer does not show still keep a folder from being deleted.
    await writeFile(join(root, folder, 'nested', '.keep'), '')
    await explorer.getByRole('button', { name: 'Actions for nested', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete…' }).click()
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('This folder still contains files, including any the explorer does not show. Move or delete them first.')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await rm(join(root, folder, 'nested', '.keep'))

    await explorer.getByRole('button', { name: 'nested', exact: true }).focus()
    await page.keyboard.press('F2')
    await pathInput.fill(`${folder}/empty`)
    await dialog.getByRole('button', { name: 'Move', exact: true }).click()
    await expect(explorer.getByRole('button', { name: 'empty', exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: 'empty', exact: true }).focus()
    await page.keyboard.press('Delete')
    await expect(dialog).toContainText(`Permanently delete the empty folder ${folder}/empty?`)
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    // The open dialog hides the explorer from role queries until the deletion finishes.
    await expect(dialog).toHaveCount(0)
    await expect(explorer.getByRole('button', { name: 'empty', exact: true })).toHaveCount(0)
    expect(await readdir(join(root, folder))).toEqual([])

    // Narrow screens reach the same actions from the file drawer.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open project files', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Project files', exact: true })
    await expect(drawer.getByRole('textbox', { name: 'Filter files', exact: true })).toBeFocused()
    const actions = drawer.getByRole('button', { name: `Actions for ${folder}`, exact: true })
    await expect(actions).toHaveCSS('opacity', '1')
    await actions.click()
    await page.getByRole('menuitem', { name: 'New file here…' }).click()
    await expect(drawer).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'New file', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  finally {
    await rm(join(root, folder), { recursive: true, force: true })
  }
})

test('read-only storage keeps file changes unavailable in the explorer and refused by the service', async ({ page, audit }) => {
  audit.allowHttp(503, '/api/diagrams/entries')
  const url = process.env.MERDECK_UNSUPPORTED_URL
  if (!url)
    throw new Error('Set MERDECK_UNSUPPORTED_URL to an actual unsupported-storage service.')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(url)
  await page.getByLabel('Access token', { exact: true }).fill((await readFile(tokenFile, 'utf8')).trim())
  await page.getByRole('button', { name: 'Connect to project' }).click()
  const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
  await expect(explorer.getByRole('button', { name: 'New file', exact: true })).toBeDisabled()
  await expect(explorer.getByRole('button', { name: 'New folder', exact: true })).toBeDisabled()
  await explorer.getByRole('button', { name: 'Actions for welcome.mmd', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Rename or move…' })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Delete…' })).toBeDisabled()
  await page.keyboard.press('Escape')
  const refusal = await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    const response = await fetch('/api/diagrams/entries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.data.csrfToken }, body: JSON.stringify({ kind: 'directory', path: 'refused' }) })
    return { status: response.status, code: (await response.json()).error.code }
  })
  expect(refusal).toEqual({ status: 503, code: 'filesystem_unsupported' })
})
