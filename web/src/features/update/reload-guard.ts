import type { Drafts } from '@/features/workspace/drafts'
import { dirty } from '@/features/workspace/drafts'

/** Work a reload would lose: unsaved, retained, locked, warned or saving drafts in any file. */
export function protectedWork(drafts: Drafts) {
  return Object.values(drafts).some(file => dirty(file) || file.locked || !!file.warning || !!file.saving)
}
