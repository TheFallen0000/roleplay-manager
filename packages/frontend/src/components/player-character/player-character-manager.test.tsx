import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import { PlayerCharacterManager } from "./player-character-manager"

const alice: PlayerCharacterDTO = {
  id: "pc-1",
  name: "Alice",
  description: "Una exploradora curiosa.",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
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
})

afterEach(() => {
  cleanup()
})

describe("PlayerCharacterManager", () => {
  it("lista las personas con nombre y descripción", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])

    render(<PlayerCharacterManager />)

    expect(await screen.findByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Una exploradora curiosa.")).toBeInTheDocument()
  })

  it("muestra el estado vacío sin personas", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([])

    render(<PlayerCharacterManager />)

    expect(
      await screen.findByText(/Todavía no has creado ninguna persona/),
    ).toBeInTheDocument()
  })

  it("crea una persona desde el diálogo", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([])
    mocks.createPlayerCharacter.mockResolvedValue(alice)

    render(<PlayerCharacterManager />)
    fireEvent.click(await screen.findByText("Crear persona"))

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
      }),
    )
  })

  it("elimina una persona con confirmación", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])
    mocks.deletePlayerCharacter.mockResolvedValue(undefined)

    render(<PlayerCharacterManager />)
    fireEvent.click(await screen.findByText("Eliminar"))

    expect(await screen.findByText("¿Eliminar persona?")).toBeInTheDocument()
    const confirmButton = screen.getAllByText("Eliminar").at(-1)!
    fireEvent.click(confirmButton)

    await waitFor(() =>
      expect(mocks.deletePlayerCharacter).toHaveBeenCalledWith("pc-1"),
    )
  })
})
