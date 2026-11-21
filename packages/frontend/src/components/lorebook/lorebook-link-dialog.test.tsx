import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listCharacters: vi.fn(),
  listCharactersPage: vi.fn(),
  linkLorebook: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  listCharacters: mocks.listCharacters,
  listCharactersPage: mocks.listCharactersPage,
}))

vi.mock("@/lib/api/lorebooks", () => ({
  linkLorebook: mocks.linkLorebook,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookLinkDialog } from "./lorebook-link-dialog"

const characters = [
  {
    id: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    versionNumber: 3,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
  },
  {
    id: "char-2",
    name: "Kael",
    subtitle: null,
    profileImageAssetId: null,
    versionNumber: 1,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
  },
]

const renderDialog = () => {
  const onOpenChange = vi.fn()
  const onLinked = vi.fn()
  render(
    <I18nProvider initialLocale="es">
      <LorebookLinkDialog
        open
        lorebookId="book-1"
        versionId="version-2"
        onOpenChange={onOpenChange}
        onLinked={onLinked}
      />
    </I18nProvider>,
  )
  return { onOpenChange, onLinked }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listCharacters.mockResolvedValue(characters)
  mocks.listCharactersPage.mockResolvedValue({
    characters,
    hasMore: false,
    nextOffset: null,
  })
  mocks.linkLorebook.mockResolvedValue({ id: "cv-4" })
})

afterEach(() => {
  cleanup()
})

describe("LorebookLinkDialog", () => {
  it("warns that linking creates a new character version", async () => {
    renderDialog()

    expect(
      await screen.findByText(/Esto crea una versión nueva del personaje/i),
    ).toBeInTheDocument()
  })

  it("links the selected character only after confirmation", async () => {
    const { onLinked } = renderDialog()

    const trigger = await screen.findByLabelText(/Elegir personaje|Personaje/i)
    if (trigger.tagName === "SELECT") {
      await userEvent.selectOptions(trigger, "char-1")
    } else {
      await userEvent.click(trigger)
      await userEvent.click(
        await screen.findByRole("option", { name: /Lyra/i }),
      )
    }

    expect(mocks.linkLorebook).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: /Vincular a un personaje/i }),
    )

    await waitFor(() =>
      expect(mocks.linkLorebook).toHaveBeenCalledWith("book-1", {
        characterId: "char-1",
        versionId: "version-2",
      }),
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Lyra"),
    )
    expect(onLinked).toHaveBeenCalled()
  })
})
