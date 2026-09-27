import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { createQueryClient } from '@/shared/lib/query'
import { ThemeProvider } from './theme'

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = React.useState(createQueryClient)
  return <QueryClientProvider client={queryClient}><ThemeProvider><TooltipProvider>{children}</TooltipProvider></ThemeProvider></QueryClientProvider>
}
