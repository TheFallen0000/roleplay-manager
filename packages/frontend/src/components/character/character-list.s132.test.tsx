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
  getLorebook: vi.fn(),
  updateLorebook: vi.fn(),
  createLorebookEntry: vi.fn(),
  updateLorebookEntry: vi.fn(),
  deleteLorebookEntry: vi.fn(),
  reorderLorebookEntries: vi.fn(),
  importLorebook: vi.fn(),
  exportLorebook: vi.fn(),
  previewLorebook: vi.fn(),
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
vi.mock("@/lib/api/lorebook", () => ({
  getLorebook: mocks.getLorebook,
  updateLorebook: mocks.updateLorebook,
  createLorebookEntry: mocks.createLorebookEntry,
  updateLorebookEntry: mocks.updateLorebookEntry,
  deleteLorebookEntry: mocks.deleteLorebookEntry,
  reorderLorebookEntries: mocks.reorderLorebookEntries,
  importLorebook: mocks.importLorebook,
  exportLorebook: mocks.exportLorebook,
  previewLorebook: mocks.previewLorebook,
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

describe("CharacterList — Crear modal", () => {
  it("opens a modal with Personaje and Lorebook tabs instead of navigating", async () => {
    render(<CharacterList locale="es" />)

    const triggers = await screen.findAllByText(/Crear personaje/i)
    fireEvent.click(triggers[0])

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Personaje/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Lorebook/i })).toBeInTheDocument()
  })

  it("keeps /characters/new as a deep-link", async () => {
    render(<CharacterList locale="es" />)

    await waitFor(() => expect(mocks.listCharacters).toHaveBeenCalled())

    expect(
      document.querySelector('a[href="/characters/new"]')
    ).not.toBeNull()
  })
})
