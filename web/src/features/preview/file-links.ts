export type OpenFile = (target: string) => string | undefined | Promise<string | undefined>

export function annotateFileLinks(root: Element | null, links: Map<string, string>, enabled: boolean) {
  if (!root)
    return
  for (const linked of root.querySelectorAll('[data-file-link]')) {
    for (const attribute of ['data-file-link', 'role', 'tabindex', 'aria-label'])
      linked.removeAttribute(attribute)
  }
  if (!enabled)
    return
  for (const [id, target] of links) {
    const linked = [...root.querySelectorAll('g.node')].find(item => new RegExp(`-flowchart-${id}-\\d+$`).test(item.id))
    if (!linked)
      continue
    linked.setAttribute('data-file-link', target)
    linked.setAttribute('role', 'link')
    linked.setAttribute('tabindex', '0')
    linked.setAttribute('aria-label', `Open ${target}`)
  }
}

export function linkedFile(target: EventTarget, root: Element | null, onOpenFile?: OpenFile): string | null {
  const linked = target instanceof Element ? target.closest('[data-file-link]') : null
  const file = onOpenFile && linked && root?.contains(linked) ? linked.getAttribute('data-file-link') : null
  return file || null
}
