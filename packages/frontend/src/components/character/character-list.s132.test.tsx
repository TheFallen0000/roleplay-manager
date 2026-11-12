import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listCharacters: vi.fn(),
  listCharactersPage: vi.fn(),
  listCharacterVersions: vi.fn(),
  deleteCharacter: vi.fn(),
  importCharacter: vi.fn(),
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  previewSillyTavernCard: vi.fn(),
  importSillyTavernCard: vi.fn(),
  exportSillyTavernCard: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  listCharacters: mocks.listCharacters,
  listCharactersPage: mocks.listCharactersPage,
  listCharacterVersions: mocks.listCharacterVersions,
  deleteCharacter: mocks.deleteCharacter,
  importCharacter: mocks.importCharacter,
}))
vi.mock("@/lib/api/conversations", () => ({
  listConversations: mocks.listConversations,
  createConversation: mocks.createConversation,
}))
vi.mock("@/lib/api/sillytavern-card", () => ({
  previewSillyTavernCard: mocks.previewSillyTavernCard,
  importSillyTavernCard: mocks.importSillyTavernCard,
  exportSillyTavernCard: mocks.exportSillyTavernCard,
}))
import { CharacterList } from "./character-list"

beforeEach(() => {
  mocks.listCharacters.mockReset()
  mocks.listCharactersPage.mockReset()
  mocks.listCharacterVersions.mockReset()
  mocks.deleteCharacter.mockReset()
  mocks.importCharacter.mockReset()
  mocks.listConversations.mockReset()
  mocks.createConversation.mockReset()

  mocks.listCharacters.mockResolvedValue([])
  mocks.listCharactersPage.mockImplementation(async () => {
    const characters = (await mocks.listCharacters()) as unknown[]
    return { characters, hasMore: false, nextOffset: null }
  })
  mocks.listConversations.mockResolvedValue([])
  vi.stubGlobal("location", { href: "" })
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe("CharacterList — Crear dialog", () => {
  it("opens the two-plate dialog instead of navigating", async () => {
    render(<CharacterList locale="es" />)

    const triggers = await screen.findAllByText(/Crear personaje/i)
    fireEvent.click(triggers[0])

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Personaje/i })).toHaveAttribute(
      "href",
      "/characters/new",
    )
    expect(screen.getByRole("link", { name: /Lorebook/i })).toHaveAttribute(
      "href",
      "/lorebooks/new",
    )
    expect(screen.queryByRole("tab")).toBeNull()
  })

  it("keeps /characters/new as a deep-link", async () => {
    render(<CharacterList locale="es" />)

    await waitFor(() => expect(mocks.listCharacters).toHaveBeenCalled())

    expect(
      document.querySelector('a[href="/characters/new"]')
    ).not.toBeNull()
  })
})
