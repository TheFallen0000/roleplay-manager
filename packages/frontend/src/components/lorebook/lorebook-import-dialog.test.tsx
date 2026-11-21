import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  importLorebookPreview: vi.fn(),
  importLorebook: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  importLorebookPreview: mocks.importLorebookPreview,
  importLorebook: mocks.importLorebook,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookImportDialog } from "./lorebook-import-dialog"

const payload = '{"spec":"lorebook_v3","data":{"name":"Bosque de Lyra"}}'

const matchedPreview = {
  matched: true,
  suggestedAction: "restore" as const,
  book: {
    id: "book-1",
    name: "Bosque de Lyra",
    deleted: true,
    matchedVersionNumber: 2,
    usedByCharacters: 3,
  },
}

const renderDialog = () => {
  const onOpenChange = vi.fn()
  const onImported = vi.fn()
  const view = render(
    <I18nProvider initialLocale="es">
      <LorebookImportDialog
        open
        format="ccv3"
        onOpenChange={onOpenChange}
        onImported={onImported}
      />
    </I18nProvider>,
  )
  const input = view.baseElement.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement
  return { input, onOpenChange, onImported }
}

const chooseFile = async (input: HTMLInputElement) => {
  await userEvent.upload(
    input,
    new File([payload], "lorebook.json", { type: "application/json" }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.importLorebook.mockResolvedValue({
    action: "restore",
    lorebook: { id: "book-1", name: "Bosque de Lyra" },
  })
})

afterEach(() => {
  cleanup()
})

describe("LorebookImportDialog", () => {
  it("previews the payload before importing and never restores silently", async () => {
    mocks.importLorebookPreview.mockResolvedValue(matchedPreview)
    const { input } = renderDialog()

    await chooseFile(input)

    await waitFor(() =>
      expect(mocks.importLorebookPreview).toHaveBeenCalledWith({
        format: "ccv3",
        payload,
      }),
    )
    expect(mocks.importLorebook).not.toHaveBeenCalled()
  })

  it("imports with the action the user confirms for a matched book", async () => {
    mocks.importLorebookPreview.mockResolvedValue(matchedPreview)
    const { input, onImported } = renderDialog()

    await chooseFile(input)
    await screen.findByText(/Bosque de Lyra/i)
    expect(mocks.importLorebook).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: /Restaurar/i }),
    )

    await waitFor(() =>
      expect(mocks.importLorebook).toHaveBeenCalledWith({
        format: "ccv3",
        payload,
        action: "restore",
      }),
    )
    await waitFor(() => expect(onImported).toHaveBeenCalled())
  })

  it("creates a new book when the payload has no match", async () => {
    mocks.importLorebookPreview.mockResolvedValue({
      matched: false,
      suggestedAction: "new-book" as const,
    })
    mocks.importLorebook.mockResolvedValue({
      action: "new-book",
      lorebook: { id: "book-new", name: "Bosque de Lyra" },
    })
    const { input } = renderDialog()

    await chooseFile(input)

    await waitFor(() =>
      expect(mocks.importLorebookPreview).toHaveBeenCalledWith({
        format: "ccv3",
        payload,
      }),
    )

    await waitFor(() => {
      if (mocks.importLorebook.mock.calls.length > 0) return
      const button = screen.queryByRole("button", {
        name: /Crear libro nuevo|Importar/i,
      })
      if (!button) throw new Error("waiting for the import action")
    })
    if (mocks.importLorebook.mock.calls.length === 0) {
      await userEvent.click(
        screen.getByRole("button", { name: /Crear libro nuevo|Importar/i }),
      )
    }

    await waitFor(() =>
      expect(mocks.importLorebook).toHaveBeenCalledWith({
        format: "ccv3",
        payload,
        action: "new-book",
      }),
    )
  })
})
