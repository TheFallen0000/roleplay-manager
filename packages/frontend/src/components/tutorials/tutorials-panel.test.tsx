import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { TutorialsPanel } from "./tutorials-panel"

const renderPanel = (initialTutorial: "providers" | null = null) =>
  render(<TutorialsPanel locale="es" initialTutorial={initialTutorial} />)

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

describe("TutorialsPanel", () => {
  it("lists every tutorial grouped by category", () => {
    renderPanel()

    expect(
      screen.getByRole("heading", { name: "Tutoriales" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Móvil y acceso remoto" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Inteligencia artificial" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Personalización y datos" }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: /\d+ pasos/ }),
    ).toHaveLength(9)
  })

  it("filters the cards and hides empty categories", async () => {
    renderPanel()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar en los tutoriales" }),
      "rama",
    )

    expect(
      screen.getByRole("button", { name: /Ramas de conversación/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Conectar el teléfono/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Móvil y acceso remoto" }),
    ).not.toBeInTheDocument()
  })

  it("explains when nothing matches the search", async () => {
    renderPanel()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar en los tutoriales" }),
      "zzzz",
    )

    expect(
      screen.getByText("Ningún tutorial coincide con la búsqueda."),
    ).toBeInTheDocument()
  })

  it("opens a tutorial in a dialog with steps, tips and its action", async () => {
    renderPanel()

    await userEvent.click(
      screen.getByRole("button", { name: /Ramas de conversación/ }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByText(
        "Se abre una conversación nueva con todo el historial hasta ese mensaje; la original se queda intacta.",
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Consejos")).toBeInTheDocument()
    expect(window.location.search).toBe("?t=branches")
  })

  it("opens the tutorial requested by the URL", async () => {
    renderPanel("providers")

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("link", { name: "Ir a Proveedores" }),
    ).toHaveAttribute("href", "/settings/providers")
  })
})
