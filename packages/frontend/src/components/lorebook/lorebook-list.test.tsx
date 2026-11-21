import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listLorebooks: vi.fn(),
  getLorebook: vi.fn(),
  getLorebookVersion: vi.fn(),
  listLorebookVersions: vi.fn(),
  createLorebook: vi.fn(),
  updateLorebook: vi.fn(),
  exportLorebook: vi.fn(),
  deleteLorebook: vi.fn(),
  getLorebookUsage: vi.fn(),
  linkLorebook: vi.fn(),
  restoreLorebookVersion: vi.fn(),
  importLorebookPreview: vi.fn(),
  importLorebook: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  listLorebooks: mocks.listLorebooks,
  getLorebook: mocks.getLorebook,
  getLorebookVersion: mocks.getLorebookVersion,
  listLorebookVersions: mocks.listLorebookVersions,
  createLorebook: mocks.createLorebook,
  updateLorebook: mocks.updateLorebook,
  exportLorebook: mocks.exportLorebook,
  deleteLorebook: mocks.deleteLorebook,
  getLorebookUsage: mocks.getLorebookUsage,
  linkLorebook: mocks.linkLorebook,
  restoreLorebookVersion: mocks.restoreLorebookVersion,
  importLorebookPreview: mocks.importLorebookPreview,
  importLorebook: mocks.importLorebook,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookList } from "./lorebook-list"

const renderList = () =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookList locale="es" />
    </I18nProvider>,
  )

const summaries = [
  {
    id: "book-1",
    name: "Forest lore",
    description: "Facts about the forest",
    currentVersionNumber: 2,
    entryCount: 4,
    originId: "origin-1",
    usageCount: 2,
    usageVersionCount: 5,
    updatedAt: "2026-11-11T12:00:00.000Z",
  },
  {
    id: "book-2",
    name: "Desert lore",
    description: null,
    currentVersionNumber: 1,
    entryCount: 0,
    originId: null,
    usageCount: 0,
    usageVersionCount: 0,
    updatedAt: "2026-11-11T12:00:00.000Z",
  },
]

beforeEach(() => {
  mocks.listLorebooks.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("LorebookList", () => {
  it("lists the lorebook directory with its current version and entry count", async () => {
    mocks.listLorebooks.mockResolvedValue(summaries)
    renderList()

    expect(await screen.findByText("Forest lore")).toBeInTheDocument()
    expect(screen.getByText("Desert lore")).toBeInTheDocument()
    expect(screen.getAllByText(/v2/i).length).toBeGreaterThan(0)
    const createLinks = screen.queryAllByRole("link", { name: /Crear|Nuevo/i })
    if (createLinks.length > 0) {
      for (const link of createLinks) {
        expect(link).toHaveAttribute("href", "/lorebooks/new")
      }
    } else {
      expect(
        screen.getByRole("button", { name: /Crear|Nuevo/i }),
      ).toBeInTheDocument()
    }
  })

  it("shows the real character and version usage on each card", async () => {
    mocks.listLorebooks.mockResolvedValue(summaries)
    renderList()

    expect(
      await screen.findByText(/Usado por 2 personajes · 5 versiones/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Sin usar/i).length).toBeGreaterThan(0)
  })

  it("asks the API for the selected usage filter", async () => {
    mocks.listLorebooks.mockResolvedValue(summaries)
    renderList()

    await screen.findByText("Forest lore")

    await userEvent.click(screen.getByRole("button", { name: /En uso/i }))
    await waitFor(() =>
      expect(mocks.listLorebooks).toHaveBeenLastCalledWith(
        expect.objectContaining({ filter: "in-use" }),
      ),
    )

    await userEvent.click(screen.getByRole("button", { name: /Sin usar/i }))
    await waitFor(() =>
      expect(mocks.listLorebooks).toHaveBeenLastCalledWith(
        expect.objectContaining({ filter: "unused" }),
      ),
    )
  })

  it("shows the empty state when there are no lorebooks", async () => {
    mocks.listLorebooks.mockResolvedValue([])
    renderList()

    expect(
      await screen.findByText(/Sin lorebooks|Todavía no hay lorebooks|No hay lorebooks/i),
    ).toBeInTheDocument()
  })
})
