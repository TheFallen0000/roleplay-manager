import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getCharacter: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  updateCharacterProfileImage: vi.fn(),
  deleteCharacter: vi.fn(),
  listLorebooks: vi.fn(),
  getLorebook: vi.fn(),
  listLorebookVersions: vi.fn(),
  getLorebookVersion: vi.fn(),
  createLorebook: vi.fn(),
  updateLorebook: vi.fn(),
  getCharacterCard: vi.fn(),
  updateCharacterCard: vi.fn(),
  previewSillyTavernCard: vi.fn(),
  importSillyTavernCard: vi.fn(),
  exportSillyTavernCard: vi.fn(),
  listConversations: vi.fn(),
  createConversation: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  getCharacter: mocks.getCharacter,
  createCharacter: mocks.createCharacter,
  updateCharacter: mocks.updateCharacter,
  updateCharacterProfileImage: mocks.updateCharacterProfileImage,
  deleteCharacter: mocks.deleteCharacter,
}))

vi.mock("@/lib/api/lorebooks", () => ({
  listLorebooks: mocks.listLorebooks,
  getLorebook: mocks.getLorebook,
  listLorebookVersions: mocks.listLorebookVersions,
  getLorebookVersion: mocks.getLorebookVersion,
  createLorebook: mocks.createLorebook,
  updateLorebook: mocks.updateLorebook,
}))

vi.mock("@/lib/api/sillytavern-card", () => ({
  getCharacterCard: mocks.getCharacterCard,
  updateCharacterCard: mocks.updateCharacterCard,
  previewSillyTavernCard: mocks.previewSillyTavernCard,
  importSillyTavernCard: mocks.importSillyTavernCard,
  exportSillyTavernCard: mocks.exportSillyTavernCard,
}))

vi.mock("@/lib/api/conversations", () => ({
  listConversations: mocks.listConversations,
  createConversation: mocks.createConversation,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { CharacterPage } from "./character-page"

const now = "2026-11-11T12:00:00.000Z"

const lorebookVersion = (status: "current" | "outdated" | "deleted") => ({
  lorebookId: "book-1",
  versionId: status === "deleted" ? "version-1" : "version-2",
  versionNumber: status === "deleted" ? 1 : 2,
  name: "Forest lore",
  entryCount: 2,
  sourceKey: "a".repeat(64),
  originId: "origin-1",
  status,
})

const characterDetail = (
  status: "current" | "outdated" | "deleted" = "outdated",
) => ({
  id: "char-1",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
  currentVersion: {
    id: "ver-2",
    characterId: "char-1",
    name: "Lyra",
    subtitle: "Guardian",
    profileImageAssetId: null,
    description: "A guardian of the forest.",
    instructions: null,
    greeting: "Hello, traveler.",
    versionNumber: 2,
    createdAt: now,
    cards: [{ id: "card-1", versionId: "ver-2", title: "Oath", content: "Protect the forest.", position: 0, active: true }],
    lorebookVersion: lorebookVersion(status),
  },
  versions: [
    {
      id: "ver-1",
      characterId: "char-1",
      name: "Lyra",
      subtitle: null,
      profileImageAssetId: null,
      description: "Old Lyra.",
      instructions: null,
      greeting: "Hello.",
      versionNumber: 1,
      createdAt: now,
      cards: [],
      lorebookVersion: { ...lorebookVersion("current"), versionNumber: 1 },
    },
    {
      id: "ver-2",
      characterId: "char-1",
      name: "Lyra",
      subtitle: "Guardian",
      profileImageAssetId: null,
      description: "A guardian of the forest.",
      instructions: null,
      greeting: "Hello, traveler.",
      versionNumber: 2,
      createdAt: now,
      cards: [],
      lorebookVersion: lorebookVersion(status),
    },
  ],
})

const lorebook = {
  id: "book-1",
  characterId: null,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  originId: "origin-1",
  currentVersionId: "version-2",
  deletedAt: null,
  entries: [],
}
const lorebookSummary = {
  id: "book-1",
  name: "Forest lore",
  currentVersionNumber: 2,
  entryCount: 2,
  originId: "origin-1",
  usageCount: 0,
}

const renderPage = (characterId?: string) =>
  render(
    <I18nProvider initialLocale="es">
      <CharacterPage locale="es" characterId={characterId} />
    </I18nProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getCharacter.mockResolvedValue(characterDetail())
  mocks.updateCharacter.mockImplementation(async (id, input) => ({
    ...characterDetail(),
    id,
    currentVersion: {
      ...characterDetail().currentVersion,
      versionNumber: 3,
      lorebookVersion: null,
    },
    _input: input,
  }))
  mocks.listLorebooks.mockResolvedValue([lorebookSummary])
  mocks.getLorebook.mockResolvedValue(lorebook)
  mocks.listLorebookVersions.mockResolvedValue([
    {
      id: "version-1",
      lorebookId: "book-1",
      versionNumber: 1,
      name: "Forest lore",
      description: "Facts about the forest",
      scanDepth: 4,
      tokenBudget: 400,
      recursiveScanning: false,
      sourceKey: "a".repeat(64),
      entries: [],
    },
    {
      id: "version-2",
      lorebookId: "book-1",
      versionNumber: 2,
      name: "Forest lore",
      description: "Facts about the forest",
      scanDepth: 4,
      tokenBudget: 400,
      recursiveScanning: false,
      sourceKey: "b".repeat(64),
      entries: [],
    },
  ])
  mocks.getLorebookVersion.mockResolvedValue(undefined)
  mocks.listConversations.mockResolvedValue([])
  vi.stubGlobal("location", { href: "" })
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe("CharacterPage — sectioned card-first surface", () => {
  it("shows the section nav, save bar and an empty create form", async () => {
    renderPage()

    expect(screen.getByRole("navigation")).toBeInTheDocument()
    for (const label of ["Identidad", "Card", "Fichas", "Lorebook"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.queryByText("Versiones")).not.toBeInTheDocument()
    expect(screen.queryByText(/Tarjetas/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: /Guardar/i }).length,
    ).toBeGreaterThan(0)

    expect(
      screen.getAllByRole("textbox", { name: /Nombre/i })[0],
    ).toHaveValue("")
    expect(
      screen.getAllByRole("textbox", { name: /Descripción/i })[0],
    ).toHaveValue("")
    expect(await screen.findByText(/Sin fichas|Añadir ficha/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Sin lorebook|Vincular lorebook|Ningún lorebook/i),
    ).toBeInTheDocument()
  })

  it("shows an outdated linked lorebook with change/remove actions", async () => {
    mocks.getCharacter.mockResolvedValue(characterDetail("outdated"))
    renderPage("char-1")

    expect(
      await screen.findByRole("heading", { name: "Lyra" }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/antigua|editado|outdated/i).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /Abrir/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cambiar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Quitar/i })).toBeInTheDocument()
  })

  it("shows a deleted linked lorebook by name and version", async () => {
    mocks.getCharacter.mockResolvedValue(characterDetail("deleted"))
    renderPage("char-1")

    expect(
      (await screen.findAllByText(/Lorebook eliminado/i)).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forest lore/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/v1/i).length).toBeGreaterThan(0)
  })

  it("lists versions with their lorebook summary", async () => {
    renderPage("char-1")

    expect(
      await screen.findByRole("heading", { name: "Lyra" }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/v1/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/v2/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forest lore/i).length).toBeGreaterThan(0)
  })

  it("exposes the S133 detail actions and the card inspector", async () => {
    mocks.getCharacterCard.mockResolvedValue({
      spec: "chara_card_v3",
      data: { name: "Lyra", description: "A guardian" },
    })
    renderPage("char-1")

    expect(
      (await screen.findAllByRole("button", { name: /Nueva conversación/i }))
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Card JSON/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Eliminar personaje/i }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Card JSON/i }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Lyra")
    expect(dialog).toHaveTextContent("description")
  })

  it("removing the lorebook saves with one PUT /characters/:id and no card PUT", async () => {
    mocks.getCharacter.mockResolvedValue(characterDetail("outdated"))
    renderPage("char-1")

    await screen.findByRole("heading", { name: "Lyra" })
    await userEvent.click(screen.getByRole("button", { name: /Quitar/i }))
    if (mocks.updateCharacter.mock.calls.length === 0) {
      await userEvent.click(
        screen.getAllByRole("button", { name: /Guardar/i })[0],
      )
    }

    await waitFor(() => expect(mocks.updateCharacter).toHaveBeenCalledTimes(1))
    expect(mocks.updateCharacterCard).not.toHaveBeenCalled()
    const [, input] = mocks.updateCharacter.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(input).toMatchObject({ lorebookVersionId: null })
  })
})
