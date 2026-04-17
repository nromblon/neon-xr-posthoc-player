import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import type { ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      closeButton
      expand
      offset={20}
      visibleToasts={4}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={2.25} />,
        info: <InfoIcon className="size-4" strokeWidth={2.25} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={2.25} />,
        error: <OctagonXIcon className="size-4" strokeWidth={2.25} />,
        loading: <Loader2Icon className="size-4 animate-spin" strokeWidth={2.25} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:shadow-lg",
          title:
            "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:tracking-tight",
          description:
            "group-[.toast]:mt-1 group-[.toast]:text-[13px] group-[.toast]:leading-5 group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-foreground group-[.toast]:text-background group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:border group-[.toast]:bg-transparent group-[.toast]:font-medium",
          closeButton:
            "group-[.toast]:border group-[.toast]:border-border/70 group-[.toast]:bg-background/80 group-[.toast]:text-muted-foreground group-[.toast]:shadow-none group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground",
          success:
            "group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50 group-[.toaster]:text-emerald-950",
          info:
            "group-[.toaster]:border-sky-200 group-[.toaster]:bg-sky-50 group-[.toaster]:text-sky-950",
          warning:
            "group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-950",
          error:
            "group-[.toaster]:border-rose-200 group-[.toaster]:bg-rose-50 group-[.toaster]:text-rose-950",
        },
      }}
      style={
        {
          "--normal-bg": "color-mix(in oklab, var(--popover) 96%, white)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "color-mix(in oklab, var(--border) 88%, transparent)",
          "--border-radius": "0.9rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
