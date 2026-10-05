import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import type { CharacterSummary } from "@workspace/shared/types/character"

import { ExportDialog } from "./export-dialog"

const character: CharacterSummary = {
  id: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
}

const mocks = vi.hoisted(() => ({
  exportCharacter: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  exportCharacter: mocks.exportCharacter,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

beforeEach(() => {
  mocks.exportCharacter.mockReset()
  mocks.toastSuccess.mockReset()
  mocks.toastError.mockReset()

  URL.createObjectURL = vi.fn(() => "blob:mock-export")
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderDialog = (props: Partial<Parameters<typeof ExportDialog>[0]> = {}) =>
  render(
    <ExportDialog
      character={character}
      conversationCount={3}
      open
      onOpenChange={() => {}}
      {...props}
    />,
  )

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name })

const checkboxRoot = (name: RegExp) => {
  const el = checkbox(name)
  return el.matches("[data-slot=checkbox]")
    ? el
    : el.closest("[data-slot=checkbox]")!
}

describe("ExportDialog", () => {
  it("muestra el árbol con las secciones por defecto", () => {
    renderDialog()

    expect(checkbox(/^Definición/)).toBeChecked()
    expect(checkbox(/^Imagen de perfil/)).toBeChecked()
    expect(checkbox(/^Historial de versiones/)).toBeChecked()
    expect(checkbox(/^Conversaciones y ramas/)).toBeChecked()
    expect(checkbox(/^Mensajes/)).toBeChecked()
    expect(checkbox(/^Memorias dinámicas/)).toBeChecked()
    expect(checkbox(/^Resúmenes/)).toBeChecked()
    expect(checkbox(/^Configuraciones y personalizaciones/)).toBeChecked()
    expect(checkbox(/^Solo configuración/)).not.toBeChecked()
  })

  it("deshabilita los hijos cuando el padre Conversaciones está desmarcado", () => {
    renderDialog()

    fireEvent.click(checkbox(/^Conversaciones y ramas/))

    expect(checkbox(/^Conversaciones y ramas/)).not.toBeChecked()
    expect(checkboxRoot(/^Mensajes/)).toHaveAttribute("data-disabled")
    expect(checkbox(/^Mensajes/)).not.toBeChecked()
    expect(checkboxRoot(/^Memorias dinámicas/)).toHaveAttribute("data-disabled")
    expect(checkboxRoot(/^Resúmenes/)).toHaveAttribute("data-disabled")
    expect(checkboxRoot(/^Configuraciones y personalizaciones/)).toHaveAttribute(
      "data-disabled",
    )
  })

  it("permite marcar y desmarcar todo", () => {
    renderDialog()

    fireEvent.click(screen.getByText("Desmarcar todo"))
    expect(checkbox(/^Definición/)).not.toBeChecked()
    expect(checkbox(/^Conversaciones y ramas/)).not.toBeChecked()
    expect(checkboxRoot(/^Mensajes/)).toHaveAttribute("data-disabled")

    fireEvent.click(screen.getByText("Marcar todo"))
    expect(checkbox(/^Definición/)).toBeChecked()
    expect(checkbox(/^Mensajes/)).toBeChecked()
    expect(checkbox(/^Solo configuración/)).toBeChecked()
  })

  it("exporta las secciones seleccionadas al pulsar Exportar", async () => {
    mocks.exportCharacter.mockResolvedValue({
      schemaVersion: 1,
      kind: "character-export",
      exportedAt: "2026-08-12T10:00:00.000Z",
      character: { id: "char-1", name: "Lyra", createdAt: "", updatedAt: "" },
    })

    renderDialog()

    fireEvent.click(screen.getByText("Exportar"))

    await waitFor(() => {
      expect(mocks.exportCharacter).toHaveBeenCalledTimes(1)
    })

    const [characterId, sections] = mocks.exportCharacter.mock.calls[0]
    expect(characterId).toBe("char-1")
    expect(sections).toEqual(
      expect.arrayContaining([
        "definition",
        "profileImage",
        "versions",
        "conversations",
        "conversations.messages",
        "conversations.memories",
        "conversations.summaries",
        "conversations.settings",
      ]),
    )
    expect(sections).not.toContain("standaloneSettings")
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it("avisa si no hay ninguna sección seleccionada", () => {
    renderDialog()

    fireEvent.click(screen.getByText("Desmarcar todo"))
    fireEvent.click(screen.getByText("Exportar"))

    expect(mocks.exportCharacter).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Selecciona al menos una sección para exportar.",
    )
  })
})
