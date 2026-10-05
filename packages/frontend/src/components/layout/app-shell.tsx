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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Toaster } from "@workspace/ui/components/sonner"
import { UsersIcon, CogIcon, UserRoundIcon } from "lucide-react"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { Logo } from "@workspace/ui/components/logo"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
import { useTheme } from "@/lib/hooks/use-theme"
import { ThemeSwitcher } from "./theme-switcher"

function SidebarLogo() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarHeader className="overflow-hidden p-4 font-semibold text-sm">
      <span className="flex items-center gap-2">
        <Logo className="shrink-0" />
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShellContent>{children}</AppShellContent>
    </ThemeProvider>
  )
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useTheme()

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon" >
        <SidebarLogo />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Personajes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/" />} tooltip="Mis personajes">
                      <UsersIcon />
                      <span>Mis personajes</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/settings/providers" />} tooltip="Proveedores">
                      <CogIcon />
                      <span>Proveedores</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/settings/player-characters" />} tooltip="Personajes jugados">
                      <UserRoundIcon />
                      <span>Personajes jugados</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors position="top-right" theme={resolvedMode} />
    </SidebarProvider>
  )
}
