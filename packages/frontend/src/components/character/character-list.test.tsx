import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"

import { CharacterList } from "./character-list"

const renderList = () => render(<CharacterList locale="es" />)

const characters: CharacterSummary[] = [
  {
    id: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    versionNumber: 2,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
  {
    id: "char-2",
    name: "Kael",
    subtitle: null,
    profileImageAssetId: null,
    versionNumber: 1,
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
  },
]

const conversation: ConversationSummary = {
  id: "conv-9",
  characterId: "char-1",
  characterName: "Lyra",
  profileImageAssetId: null,
  title: "La búsqueda",
  messageCount: 8,
  lastActivityAt: "2026-07-09T10:00:00.000Z",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-09T10:00:00.000Z",
}

const mocks = vi.hoisted(() => ({
  listCharacters: vi.fn(),
  listCharacterVersions: vi.fn(),
  deleteCharacter: vi.fn(),
  importCharacter: vi.fn(),
  listConversations: vi.fn(),
  createConversation: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  listCharacters: mocks.listCharacters,
  listCharacterVersions: mocks.listCharacterVersions,
  deleteCharacter: mocks.deleteCharacter,
  importCharacter: mocks.importCharacter,
}))

vi.mock("@/lib/api/conversations", () => ({
  listConversations: mocks.listConversations,
  createConversation: mocks.createConversation,
}))

beforeEach(() => {
  mocks.listCharacters.mockReset()
  mocks.listCharacterVersions.mockReset()
  mocks.deleteCharacter.mockReset()
  mocks.importCharacter.mockReset()
  mocks.listConversations.mockReset()
  mocks.createConversation.mockReset()

  vi.stubGlobal("location", { href: "" })
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

const visibleNames = () =>
  screen
    .getAllByText(/^(Lyra|Kael)$/)
    .map((element) => element.textContent)

describe("CharacterList", () => {
  it("renderiza una card por personaje con nombre, versión y fechas", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([])

    renderList()

    expect(await screen.findByText("Lyra")).toBeInTheDocument()
    expect(screen.getByText("Kael")).toBeInTheDocument()
    expect(screen.getByText("v2")).toBeInTheDocument()
    expect(screen.getByText("v1")).toBeInTheDocument()
    expect(screen.getAllByText(/Creado:/)).toHaveLength(2)
  })

  it("al pulsar la imagen navega a la conversación más reciente si existe", async () => {
    mocks.listCharacters.mockResolvedValue([characters[0]])
    mocks.listConversations.mockResolvedValue([conversation])

    renderList()

    fireEvent.click(
      await screen.findByLabelText(
        "Abrir la conversación más reciente con Lyra",
      ),
    )

    expect(mocks.createConversation).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(window.location.href).toBe("/conversations/conv-9"),
    )
  })

  it("al pulsar la imagen sin conversaciones crea una con la versión actual", async () => {
    mocks.listCharacters.mockResolvedValue([characters[1]])
    mocks.listConversations.mockResolvedValue([])
    mocks.createConversation.mockResolvedValue({
      conversation: { id: "conv-new" },
      defaultProviderStatus: "available",
    })

    renderList()

    fireEvent.click(
      await screen.findByLabelText(
        "Abrir la conversación más reciente con Kael",
      ),
    )

    expect(mocks.createConversation).toHaveBeenCalledWith({
      characterId: "char-2",
    })
    await waitFor(() =>
      expect(window.location.href).toBe("/conversations/conv-new"),
    )
  })

  it("ordena por recencia: creación más reciente primero", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([])

    renderList()

    await screen.findByText("Lyra")
    const names = screen
      .getAllByText(/^(Lyra|Kael)$/)
      .map((element) => element.textContent)
    expect(names).toEqual(["Kael", "Lyra"])
  })

  it("ordena por recencia: la última actividad sube al personaje al principio", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([conversation])

    renderList()

    await screen.findByText("Lyra")
    const names = screen
      .getAllByText(/^(Lyra|Kael)$/)
      .map((element) => element.textContent)
    expect(names).toEqual(["Lyra", "Kael"])
  })

  it("abre el diálogo de importación al pulsar Importar personaje", async () => {
    mocks.listCharacters.mockResolvedValue([])
    mocks.listConversations.mockResolvedValue([])

    renderList()

    fireEvent.click(await screen.findByText("Importar personaje"))

    expect(
      await screen.findByText(/Suelta un archivo JSON exportado/),
    ).toBeInTheDocument()
  })

  it("filtra por nombre con la búsqueda", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([])

    renderList()
    await screen.findByText("Lyra")

    fireEvent.change(screen.getByLabelText("Buscar personaje"), {
      target: { value: "lyr" },
    })

    expect(screen.getByText("Lyra")).toBeInTheDocument()
    expect(screen.queryByText("Kael")).not.toBeInTheDocument()
    expect(screen.getByText(/1 resultado/)).toBeInTheDocument()
  })

  it("muestra un estado sin resultados cuando la búsqueda no coincide", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([])

    renderList()
    await screen.findByText("Lyra")

    fireEvent.change(screen.getByLabelText("Buscar personaje"), {
      target: { value: "zzz" },
    })

    expect(
      screen.getByText(/No hay personajes que coincidan/),
    ).toBeInTheDocument()
  })

  it("cambia el orden con el Select", async () => {
    mocks.listCharacters.mockResolvedValue(characters)
    mocks.listConversations.mockResolvedValue([])

    renderList()
    await screen.findByText("Lyra")

    expect(visibleNames()).toEqual(["Kael", "Lyra"])

    const user = userEvent.setup()
    await user.click(screen.getByLabelText("Ordenar por"))
    const option = await screen.findByRole("option", { name: "Más antiguos" })
    await user.click(option)

    await waitFor(() => expect(visibleNames()).toEqual(["Lyra", "Kael"]))
  })
})
