import { lazy, Suspense } from 'react'
import {
  type ErrorResponse,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from 'react-router'

import { Breakpoints, BSOD, SVGDefs } from 'src/components'
import { Providers } from 'src/contexts'
import mainCSS from 'src/styles/main.css?url'

import type { Route } from './+types/root'
import { SHOW_APP_DRAWER } from './lib/env'

export const links: Route.LinksFunction = () => [
  {
    rel: 'manifest',
    href: '/site.webmanifest',
  },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap',
  },
  { rel: 'stylesheet', href: mainCSS },
]

export function Layout({ children }: React.PropsWithChildren) {
  return (
    <html lang='en' className='pointer-fine:overscroll-none'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#111111' />
        <Meta />
        <Links />
      </head>
      <body className='antialiased'>
        {children}
        <SVGDefs />
        <ScrollRestoration />
        <Breakpoints />
        <Scripts />
      </body>
    </html>
  )
}

const AppDrawer = lazy(() => import('src/components/AppDrawer'))

export default function App() {
  const location = useLocation()
  const isApp = location.pathname !== '/' && SHOW_APP_DRAWER

  return (
    <Providers>
      <Suspense fallback={null}>{isApp && <AppDrawer />}</Suspense>
      <Outlet /> {/* Apps go here */}
    </Providers>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let e: ErrorResponse = {
    status: 499,
    statusText: 'CLIENT_CRASHED',
    data: undefined,
  }

  if (isRouteErrorResponse(error)) {
    e = error
  } else if (error instanceof Error) {
    e = {
      status: 499,
      statusText: error.message,
      data: error.stack,
    }
  }

  return <BSOD error={e} />
}
