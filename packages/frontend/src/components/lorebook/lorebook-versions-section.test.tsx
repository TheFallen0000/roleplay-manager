import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { LorebookVersionsSection } from "./lorebook-versions-section"
import type { LorebookPageState } from "./use-lorebook-page"

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
    entries: [],
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
    entries: [],
    createdAt: "2026-11-11T12:00:00.000Z",
  },
]

const makeState = (
  overrides: Partial<{ selectedVersionId: string; readOnly: boolean }> = {},
) => {
  const restoreVersion = vi.fn().mockResolvedValue(undefined)
  const state = {
    versions,
    selectedVersionId: overrides.selectedVersionId ?? "version-2",
    readOnly: overrides.readOnly ?? false,
    lorebook: {
      id: "book-1",
      name: "Forest lore",
      characterId: null,
      description: "Facts about the forest",
      scanDepth: 8,
      tokenBudget: 900,
      recursiveScanning: true,
      extensions: {},
      unknownFields: null,
      originId: "origin-1",
      currentVersionId: "version-2",
      currentVersionNumber: 2,
      deletedAt: null,
      entries: [],
    },
    handleVersionChange: vi.fn().mockResolvedValue(undefined),
    restoreVersion,
  }
  return { state, restoreVersion }
}

const renderSection = (state: ReturnType<typeof makeState>["state"]) =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookVersionsSection
        state={state as unknown as LorebookPageState}
      />
    </I18nProvider>,
  )

const versionRow = (label: string) =>
  screen
    .getAllByRole("listitem")
    .find((row) => within(row).queryByText(label) !== null)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("LorebookVersionsSection", () => {
  it("offers restore only for non-current versions", () => {
    const { state } = makeState()
    renderSection(state)

    const current = versionRow("Versión actual")
    const old = versionRow("v1")

    expect(current).toBeDefined()
    expect(old).toBeDefined()
    expect(
      within(current!).queryByRole("button", { name: /Restaurar/i }),
    ).toBeNull()
    expect(
      within(old!).getByRole("button", { name: /Restaurar/i }),
    ).toBeInTheDocument()
  })

  it("restores an old version as a new version", async () => {
    const { state, restoreVersion } = makeState()
    renderSection(state)

    const old = versionRow("v1")
    await userEvent.click(
      within(old!).getByRole("button", { name: /Restaurar/i }),
    )

    expect(restoreVersion).toHaveBeenCalledWith("version-1")
  })

  it("does not render the S134 deferred placeholder", () => {
    const { state } = makeState()
    renderSection(state)

    expect(screen.queryByText(/S134/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Restaurar, el uso por versión/i),
    ).not.toBeInTheDocument()
  })

  it("keeps old versions read-only", () => {
    const { state } = makeState({
      selectedVersionId: "version-1",
      readOnly: true,
    })
    renderSection(state)

    expect(screen.getAllByText(/solo lectura/i).length).toBeGreaterThan(0)
  })
})
