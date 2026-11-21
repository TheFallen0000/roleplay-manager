import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getLorebookUsage: vi.fn(),
  listCharacters: vi.fn(),
  listCharactersPage: vi.fn(),
  linkLorebook: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  getLorebookUsage: mocks.getLorebookUsage,
  linkLorebook: mocks.linkLorebook,
}))

vi.mock("@/lib/api/characters", () => ({
  listCharacters: mocks.listCharacters,
  listCharactersPage: mocks.listCharactersPage,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookLinkSection } from "./lorebook-link-section"

const usage = {
  characters: [
    {
      characterId: "char-1",
      characterName: "Lyra",
      inUse: [
        {
          characterVersionId: "cv-3",
          characterVersionNumber: 3,
          isCurrentCharacterVersion: true,
          lorebookVersionNumber: 2,
        },
      ],
      history: [
        {
          characterVersionId: "cv-1",
          characterVersionNumber: 1,
          isCurrentCharacterVersion: false,
          lorebookVersionNumber: 1,
        },
      ],
    },
    {
      characterId: "char-2",
      characterName: "Kael",
      inUse: [],
      history: [
        {
          characterVersionId: "cv-2",
          characterVersionNumber: 2,
          isCurrentCharacterVersion: true,
          lorebookVersionNumber: 1,
        },
      ],
    },
  ],
}

const renderSection = () =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookLinkSection lorebookId="book-1" versionId="version-2" />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.getLorebookUsage.mockReset()
  mocks.listCharacters.mockReset()
  mocks.listCharactersPage.mockReset()
  mocks.linkLorebook.mockReset()
  mocks.getLorebookUsage.mockResolvedValue(usage)
  mocks.listCharacters.mockResolvedValue([])
  mocks.listCharactersPage.mockResolvedValue({
    characters: [],
    hasMore: false,
    nextOffset: null,
  })
})

afterEach(() => {
  cleanup()
})

describe("LorebookLinkSection", () => {
  it("loads the usage for the selected version", async () => {
    renderSection()

    expect(await screen.findByText("Lyra")).toBeInTheDocument()
    expect(mocks.getLorebookUsage).toHaveBeenCalledTimes(1)
    expect(mocks.getLorebookUsage).toHaveBeenCalledWith("book-1", "version-2")
  })

  it("groups characters under En uso por and Historial with actual/histórica markers", async () => {
    renderSection()

    expect(await screen.findByText(/En uso por/i)).toBeInTheDocument()
    expect(screen.getByText(/Historial/i)).toBeInTheDocument()

    expect(screen.getAllByText("Lyra").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Kael").length).toBeGreaterThan(0)

    expect(screen.getAllByText(/v3 · actual/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/v1 · histórica/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/v2 · actual/i).length).toBeGreaterThan(0)
  })

  it("offers a button to link the book to a character", async () => {
    renderSection()

    await screen.findByText("Lyra")

    expect(
      screen.getByRole("button", { name: /Vincular a un personaje/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/S134|llegará en S134/i)).not.toBeInTheDocument()
  })
})
