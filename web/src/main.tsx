import { createRouter, RouterProvider } from '@tanstack/react-router'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from './app/providers'
import { routeTree } from './app/routeTree.gen'
import './index.css'

if (window.location.pathname === '/index.html')
  window.history.replaceState(null, '', `/${window.location.search}${window.location.hash}`)

const router = createRouter({ routeTree })
declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
const element = document.getElementById('root')
if (!element)
  throw new Error('Root element #root not found')
createRoot(element).render(<React.StrictMode><Providers><RouterProvider router={router} /></Providers></React.StrictMode>)
