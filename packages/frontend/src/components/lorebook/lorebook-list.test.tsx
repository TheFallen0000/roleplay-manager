import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listLorebooks: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  listLorebooks: mocks.listLorebooks,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookList } from "./lorebook-list"

const renderList = () =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookList locale="es" />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.listLorebooks.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("LorebookList", () => {
  it("lists the lorebook directory with its current version and entry count", async () => {
    mocks.listLorebooks.mockResolvedValue([
      {
        id: "book-1",
        name: "Forest lore",
        currentVersionNumber: 2,
        entryCount: 4,
        originId: "origin-1",
        usageCount: 0,
      },
      {
        id: "book-2",
        name: "Desert lore",
        currentVersionNumber: 1,
        entryCount: 0,
        originId: null,
        usageCount: 0,
      },
    ])
    renderList()

    expect(await screen.findByText("Forest lore")).toBeInTheDocument()
    expect(screen.getByText("Desert lore")).toBeInTheDocument()
    expect(screen.getAllByText(/v2/i).length).toBeGreaterThan(0)
    const createLink = screen.queryByRole("link", { name: /Crear|Nuevo/i })
    if (createLink) {
      expect(createLink).toHaveAttribute("href", "/lorebooks/new")
    } else {
      expect(
        screen.getByRole("button", { name: /Crear|Nuevo/i }),
      ).toBeInTheDocument()
    }
  })

  it("shows the empty state when there are no lorebooks", async () => {
    mocks.listLorebooks.mockResolvedValue([])
    renderList()

    expect(
      await screen.findByText(/Sin lorebooks|Todavía no hay lorebooks|No hay lorebooks/i),
    ).toBeInTheDocument()
  })
})
