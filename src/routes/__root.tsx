import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  useMatchRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { IntlayerProvider } from 'react-intlayer'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { ScanIcon } from 'lucide-react'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Posthoc Neon XR Player',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function CalibrateButton() {
  const matchRoute = useMatchRoute()
  const onCalibration = matchRoute({ to: '/calibration' })
  if (onCalibration) return null
  return (
    <div className="fixed top-4 right-4 z-50">
      <Link to="/calibration">
        <Button variant="outline" size="sm" className="gap-1.5">
          <ScanIcon className="h-3.5 w-3.5" />
          Calibrate
        </Button>
      </Link>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <IntlayerProvider>
          <LanguageSwitcher />
          <CalibrateButton />
          {children}
          <Toaster position="bottom-right" richColors={true} />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </IntlayerProvider>
        <Scripts />
      </body>
    </html>
  )
}
