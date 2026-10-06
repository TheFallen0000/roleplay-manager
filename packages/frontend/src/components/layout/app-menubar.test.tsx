import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
import { AppMenubar } from "./app-menubar"

function renderMenubar(locale: "en" | "es" = "es") {
  return render(
    <I18nProvider initialLocale={locale}>
      <ThemeProvider>
        <AppMenubar />
      </ThemeProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal("location", { href: "http://localhost/", reload: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  useTunnelStore.setState({ status: null, lanStatus: null })
  document.cookie = "language=; path=/; max-age=0"
})

describe("AppMenubar", () => {
  it("muestra los menús de tema e idioma", () => {
    renderMenubar()

    expect(screen.getByRole("menuitem", { name: "Tema" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Idioma" })).toBeInTheDocument()
  })

  it("cambia el tema desde el menú", async () => {
    renderMenubar()

    await userEvent.click(screen.getByRole("menuitem", { name: "Tema" }))
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Bosque" }),
    )

    expect(localStorage.getItem("theme")).toBe("forest")
  })

  it("cambia el modo desde el menú", async () => {
    renderMenubar()

    await userEvent.click(screen.getByRole("menuitem", { name: "Tema" }))
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Oscuro" }),
    )

    expect(localStorage.getItem("color-mode")).toBe("dark")
  })

  it("cambia el idioma desde el menú", async () => {
    renderMenubar("en")

    await userEvent.click(screen.getByRole("menuitem", { name: "Language" }))
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Spanish" }),
    )

    expect(document.cookie).toContain("language=es")
  })

  it("muestra el menú de teléfono", () => {
    renderMenubar()

    expect(
      screen.getByRole("menuitem", { name: /Teléfono/ }),
    ).toBeInTheDocument()
  })

  it("muestra el punto de estado cuando el túnel está activo", () => {
    useTunnelStore.setState({
      status: {
        available: true,
        connected: true,
        active: true,
        url: "https://desktop.tailnet-abc.ts.net",
      },
    })

    renderMenubar()

    expect(screen.getByTestId("tunnel-status-dot")).toBeInTheDocument()
  })

  it("no muestra el punto de estado cuando el túnel está inactivo", () => {
    useTunnelStore.setState({
      status: {
        available: true,
        connected: true,
        active: false,
        url: "https://desktop.tailnet-abc.ts.net",
      },
    })

    renderMenubar()

    expect(screen.queryByTestId("tunnel-status-dot")).not.toBeInTheDocument()
  })

  it("muestra el punto tras hidratar cuando el estado está en caché", async () => {
    localStorage.setItem(
      "rm_tunnel_status",
      JSON.stringify({
        available: true,
        connected: true,
        active: true,
        url: "https://desktop.tailnet-abc.ts.net",
      }),
    )

    renderMenubar()

    expect(await screen.findByTestId("tunnel-status-dot")).toBeInTheDocument()
  })

  it("muestra el punto cuando el modo de red local está activo", () => {
    useTunnelStore.setState({
      status: null,
      lanStatus: {
        active: true,
        port: 4322,
        addresses: ["192.168.1.10"],
      },
    })

    renderMenubar()

    expect(screen.getByTestId("tunnel-status-dot")).toBeInTheDocument()
  })
})
