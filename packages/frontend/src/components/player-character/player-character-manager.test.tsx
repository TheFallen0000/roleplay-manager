import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import { PlayerCharacterManager } from "./player-character-manager"

const renderManager = () => render(<PlayerCharacterManager locale="es" />)

const alice: PlayerCharacterDTO = {
  id: "pc-1",
  name: "Alice",
  description: "Una exploradora curiosa.",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
}

const validExport = {
  schemaVersion: 1,
  kind: "player-character-export",
  exportedAt: "2026-10-13T12:00:00.000Z",
  playerCharacter: {
    name: "Alice",
    description: "Una exploradora curiosa.",
  },
}

const mocks = vi.hoisted(() => ({
  listPlayerCharacters: vi.fn(),
  createPlayerCharacter: vi.fn(),
  updatePlayerCharacter: vi.fn(),
  deletePlayerCharacter: vi.fn(),
}))

vi.mock("@/lib/api/player-characters", () => ({
  listPlayerCharacters: mocks.listPlayerCharacters,
  createPlayerCharacter: mocks.createPlayerCharacter,
  updatePlayerCharacter: mocks.updatePlayerCharacter,
  deletePlayerCharacter: mocks.deletePlayerCharacter,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  mocks.listPlayerCharacters.mockReset()
  mocks.createPlayerCharacter.mockReset()
  mocks.updatePlayerCharacter.mockReset()
  mocks.deletePlayerCharacter.mockReset()

  URL.createObjectURL = vi.fn(() => "blob:mock-export")
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("PlayerCharacterManager", () => {
  it("lista las personas con nombre y descripción", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])

    renderManager()

    expect(await screen.findByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Una exploradora curiosa.")).toBeInTheDocument()
  })

  it("muestra el estado vacío sin personas", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([])

    renderManager()

    expect(await screen.findByText("Tu elenco está vacío")).toBeInTheDocument()
  })

  it("crea una persona desde el diálogo", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([])
    mocks.createPlayerCharacter.mockResolvedValue(alice)

    renderManager()
    const createButtons = await screen.findAllByRole("button", {
      name: "Crear persona",
    })
    fireEvent.click(createButtons[0])

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Alice" },
    })
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Una exploradora curiosa." },
    })
    fireEvent.click(screen.getByText("Guardar"))

    await waitFor(() =>
      expect(mocks.createPlayerCharacter).toHaveBeenCalledWith({
        name: "Alice",
        description: "Una exploradora curiosa.",
      })
    )
  })

  it("elimina una persona con confirmación", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])
    mocks.deletePlayerCharacter.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderManager()
    await user.click(await screen.findByText("Opciones"))
    await user.click(await screen.findByText("Eliminar"))

    expect(await screen.findByText("¿Eliminar persona?")).toBeInTheDocument()
    const confirmButton = screen.getAllByText("Eliminar").at(-1)!
    await user.click(confirmButton)

    await waitFor(() =>
      expect(mocks.deletePlayerCharacter).toHaveBeenCalledWith("pc-1")
    )
  })

  it("exporta una persona y descarga el JSON", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])

    const user = userEvent.setup()
    renderManager()
    await user.click(await screen.findByText("Opciones"))
    await user.click(await screen.findByText("Exportar", {}, { timeout: 3000 }))

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  })

  it("importa una persona desde el diálogo", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([])
    mocks.createPlayerCharacter.mockResolvedValue(alice)

    renderManager()
    fireEvent.click(await screen.findByText("Importar persona"))

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File([JSON.stringify(validExport)], "persona.json", {
            type: "application/json",
          }),
        ],
      },
    })

    await waitFor(() =>
      expect(mocks.createPlayerCharacter).toHaveBeenCalledWith({
        name: "Alice",
        description: "Una exploradora curiosa.",
      })
    )
  })
})
