import { createFileRoute } from '@tanstack/react-router'
import { validPath } from '@/features/workspace/api'
import { Workspace } from '@/features/workspace/workspace'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { path: string, block: number } => ({
    path: validPath(search.path) ? search.path : '',
    block: typeof search.block === 'number' && Number.isSafeInteger(search.block) && search.block >= 0 && search.block < 1000 ? search.block : 0,
  }),
  component: Home,
})
export function Home() {
  const { path, block } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Workspace
      path={path}
      block={block}
      navigate={(next, index) => {
        void navigate({ search: { path: next, block: index } })
      }}
    />
  )
}
