import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { CharacterRail } from "./character-rail"
import type { CharacterPageState } from "./use-character-page"

const baseState = {
  character: null,
  name: "Lyra",
  subtitle: "Guardiana del bosque",
  description: "Una guardiana que protege el bosque.",
  profileImageAssetId: null,
  pendingFile: null,
  cards: [],
  cardFields: {
    tagline: "",
    tags: ["fantasy", "forest"],
  },
  lorebookSummary: null,
  versions: [],
} as unknown as CharacterPageState

const renderRail = (state: CharacterPageState) =>
  render(
    <I18nProvider initialLocale="es">
      <CharacterRail state={state} />
    </I18nProvider>,
  )

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:pending-preview")
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("CharacterRail preview", () => {
  it("shows the pending image and live name/tags while creating", () => {
    const file = new File(["image"], "lyra.png", { type: "image/png" })
    const { container } = renderRail({
      ...baseState,
      pendingFile: file,
    } as CharacterPageState)

    const image = container.querySelector(".rm-preview-cover img")
    expect(image).toHaveAttribute("src", "blob:pending-preview")
    expect(screen.getByText("Lyra")).toBeInTheDocument()
    expect(screen.getByText("fantasy")).toBeInTheDocument()
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
  })

  it("uses the original asset for a saved character image", () => {
    const { container } = renderRail({
      ...baseState,
      character: {
        id: "char-1",
        currentVersion: { versionNumber: 2 },
        updatedAt: "2026-11-11T12:00:00.000Z",
      },
      profileImageAssetId: "asset-1",
    } as unknown as CharacterPageState)

    const image = container.querySelector(".rm-preview-cover img")
    expect(image).toHaveAttribute(
      "src",
      expect.stringContaining("/characters/char-1/assets/asset-1"),
    )
    expect(image?.getAttribute("src")).not.toContain("variant=")
  })
})
