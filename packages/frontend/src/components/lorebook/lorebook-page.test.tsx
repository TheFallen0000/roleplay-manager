import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getLorebook: vi.fn(),
  listLorebookVersions: vi.fn(),
  getLorebookVersion: vi.fn(),
  createLorebook: vi.fn(),
  updateLorebook: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  getLorebook: mocks.getLorebook,
  listLorebookVersions: mocks.listLorebookVersions,
  getLorebookVersion: mocks.getLorebookVersion,
  createLorebook: mocks.createLorebook,
  updateLorebook: mocks.updateLorebook,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookPage } from "./lorebook-page"

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
  entries: [
    {
      id: "entry-1",
      name: "Dragon lore",
      sourceId: "1",
      keys: ["dragon"],
      secondaryKeys: [],
      comment: null,
      content: "Dragons dwell here.",
      constant: false,
      selective: false,
      selectiveLogic: 0,
      insertionOrder: 100,
      position: "after_char",
      rawPosition: "1",
      priority: 0,
      enabled: true,
      caseSensitive: false,
      wholeWords: false,
      order: 0,
      extensions: {},
      unknownFields: null,
    },
  ],
}

const versions = [
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
    entries: lorebook.entries,
    createdAt: "2026-11-10T12:00:00.000Z",
  },
  {
    id: "version-2",
    lorebookId: "book-1",
    versionNumber: 2,
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 8,
    tokenBudget: 900,
    recursiveScanning: true,
    sourceKey: "b".repeat(64),
    entries: lorebook.entries,
    createdAt: "2026-11-11T12:00:00.000Z",
  },
]

const renderPage = (lorebookId?: string) =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookPage locale="es" lorebookId={lorebookId} />
    </I18nProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getLorebook.mockResolvedValue(lorebook)
  mocks.listLorebookVersions.mockResolvedValue(versions)
  mocks.createLorebook.mockResolvedValue(lorebook)
  mocks.updateLorebook.mockResolvedValue({
    lorebook,
    createdNewVersion: false,
  })
  mocks.getLorebookVersion.mockResolvedValue(versions[0])
})

afterEach(() => {
  cleanup()
})

describe("LorebookPage — create", () => {
  it("creates a standalone v1 without linking a character", async () => {
    renderPage()

    await userEvent.type(
      screen.getAllByRole("textbox", { name: /Nombre/i })[0],
      "Forest lore",
    )
    await userEvent.click(
      screen.getAllByRole("button", { name: /Crear|Guardar/i })[0],
    )

    await waitFor(() => expect(mocks.createLorebook).toHaveBeenCalledTimes(1))
    const input = mocks.createLorebook.mock.calls[0][0] as Record<string, unknown>
    expect(input).toMatchObject({ name: "Forest lore" })
    expect(input).not.toHaveProperty("characterId")
  })

  it("shows the empty entries state", async () => {
    renderPage()

    expect(await screen.findByText(/Sin entradas/i)).toBeInTheDocument()
  })
})

describe("LorebookPage — detail and version selector", () => {
  it("shows the version selector and marks an old version read-only", async () => {
    renderPage("book-1")

    expect((await screen.findAllByText("Forest lore")).length).toBeGreaterThan(0)
    expect(mocks.listLorebookVersions).toHaveBeenCalledWith("book-1")

    const selector = screen.getByLabelText("Versión")
    if (selector.tagName === "SELECT") {
      await userEvent.selectOptions(selector, "version-1")
    } else {
      await userEvent.click(selector)
      await userEvent.click(await screen.findByRole("option", { name: /v1/i }))
    }

    expect(
      (await screen.findAllByText(/solo lectura/i)).length,
    ).toBeGreaterThan(0)
    const saves = screen.getAllByRole("button", { name: /Guardar/i })
    expect(saves.length).toBeGreaterThan(0)
    expect(saves.every((button) => button.hasAttribute("disabled"))).toBe(true)
  })
})
