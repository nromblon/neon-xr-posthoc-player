import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  useMatchRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { IntlayerProvider, useLocale  } from 'react-intlayer'
import { Globe, ScanIcon, Settings2Icon } from 'lucide-react'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'
import type { Locale } from 'intlayer'

import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

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

function SettingsMenu() {
  const { locale, setLocale } = useLocale()
  const matchRoute = useMatchRoute()
  const onCalibration = matchRoute({ to: '/calibration' })

  return (
    <div className="fixed top-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings2Icon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Language
            </span>
            <Select
              value={locale}
              onValueChange={(lang) => setLocale(lang as Locale)}
            >
              <SelectTrigger className="h-8 w-full gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!onCalibration && (
            <>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Tools
                </span>
                <Link to="/calibration">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <ScanIcon className="h-3.5 w-3.5" />
                    Calibrate
                  </Button>
                </Link>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
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
          <SettingsMenu />
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
