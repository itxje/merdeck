import { createFileRoute } from '@tanstack/react-router'
import { parentDirectory, validPath } from '@/features/workspace/api'
import { Workspace } from '@/features/workspace/workspace'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { path: string, block: number, directory: string } => ({
    path: validPath(search.path) ? search.path : '',
    directory: search.directory === '' || validPath(search.directory) ? search.directory : validPath(search.path) ? parentDirectory(search.path) : '',
    block: typeof search.block === 'number' && Number.isSafeInteger(search.block) && search.block >= 0 && search.block < 1000 ? search.block : 0,
  }),
  component: Home,
})
export function Home() {
  const { path, block, directory } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Workspace
      path={path}
      block={block}
      directory={directory}
      browse={(next) => { void navigate({ search: { path, block, directory: next } }) }}
      navigate={(next, index, nextDirectory) => {
        void navigate({ search: { path: next, block: index, directory: nextDirectory ?? parentDirectory(next) } })
      }}
    />
  )
}
