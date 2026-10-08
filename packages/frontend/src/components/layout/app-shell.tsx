import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Toaster } from "@workspace/ui/components/sonner"
import { UsersIcon, CogIcon, UserRoundIcon, RefreshCwIcon } from "lucide-react"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { BrandFace } from "./brand"
import { useEffect } from "react"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
import { useTheme } from "@/lib/hooks/use-theme"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useUpdatesStore } from "@/lib/stores/updates.store"
import type { Locale } from "@workspace/shared/i18n"
import { AppMenubar } from "./app-menubar"

function SidebarLogo() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarHeader className="overflow-hidden p-3 font-semibold text-sm">
      <span className="flex items-center gap-2">
        <BrandFace className="size-6" />
        <span
          className="inline-block transition-all duration-300 ease-in-out"
          style={{
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(-8px)" : "translateX(0)",
            maxWidth: collapsed ? 0 : 160,
          }}
        >
          Roleplay Manager
        </span>
      </span>
    </SidebarHeader>
  )
}

export function AppShell({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <I18nProvider initialLocale={locale}>
      <ThemeProvider>
        <AppShellContent>{children}</AppShellContent>
      </ThemeProvider>
    </I18nProvider>
  )
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useTheme()
  const { t } = useTranslation()
  const updateStatus = useUpdatesStore((state) => state.status)
  const hydrateUpdates = useUpdatesStore((state) => state.hydrateFromCache)
  const shouldCheckUpdates = useUpdatesStore((state) => state.shouldCheck)
  const checkUpdates = useUpdatesStore((state) => state.check)

  useEffect(() => {
    hydrateUpdates()
  }, [hydrateUpdates])

  useEffect(() => {
    if (!shouldCheckUpdates()) return
    checkUpdates().catch(() => undefined)
  }, [checkUpdates, shouldCheckUpdates])

  const updatesAvailable = updateStatus?.behind === true

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon" >
        <SidebarLogo />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.groupCharacters")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/" />} tooltip={t("nav.characters")}>
                      <UsersIcon />
                      <span>{t("nav.characters")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/player-characters" />} tooltip={t("nav.players")}>
                      <UserRoundIcon />
                      <span>{t("nav.players")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.groupSystem")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/settings/providers" />} tooltip={t("nav.providers")}>
                      <CogIcon />
                      <span>{t("nav.providers")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/settings/updates" />} tooltip={t("nav.updates")}>
                    <RefreshCwIcon />
                    <span>{t("nav.updates")}</span>
                  </SidebarMenuButton>
                  {updatesAvailable ? (
                    <SidebarMenuBadge>{t("updates.badge")}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <AppMenubar />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors position="top-right" theme={resolvedMode} />
    </SidebarProvider>
  )
}
