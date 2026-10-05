import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
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
})
