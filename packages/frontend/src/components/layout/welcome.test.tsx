import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { Welcome } from "./welcome"

beforeEach(() => {
  vi.stubGlobal("location", { href: "http://localhost/", reload: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.cookie = "rm_onboarded=; path=/; max-age=0"
  document.cookie = "language=; path=/; max-age=0"
})

describe("Welcome", () => {
  it("pregunta idioma, tema y modo", () => {
    render(<Welcome locale="es" />)

    expect(
      screen.getByText("Bienvenido a Roleplay Manager"),
    ).toBeInTheDocument()
    expect(screen.getByText("Idioma")).toBeInTheDocument()
    expect(screen.getByText("Tema")).toBeInTheDocument()
    expect(screen.getByText("Modo")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument()
  })

  it("cambia de idioma sin recargar y guarda la preferencia", async () => {
    render(<Welcome locale="es" />)

    await userEvent.click(screen.getByRole("button", { name: "Inglés" }))

    expect(
      screen.getByText("Welcome to Roleplay Manager"),
    ).toBeInTheDocument()
    expect(document.cookie).toContain("language=en")
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it("aplica y guarda el tema elegido", async () => {
    render(<Welcome locale="es" />)

    await userEvent.click(screen.getByRole("button", { name: "Bosque" }))

    expect(localStorage.getItem("theme")).toBe("forest")
    expect(document.documentElement.dataset.theme).toBe("forest")
  })

  it("marca la bienvenida como completada y recarga al continuar", async () => {
    render(<Welcome locale="es" />)

    await userEvent.click(screen.getByRole("button", { name: "Continuar" }))

    expect(document.cookie).toContain("rm_onboarded=1")
    expect(window.location.reload).toHaveBeenCalled()
  })
})
