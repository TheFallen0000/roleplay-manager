import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { LorebookRestoreDialog } from "./lorebook-restore-dialog"

const baseBook = {
  id: "book-1",
  name: "Bosque de Lyra",
  deleted: false,
  matchedVersionNumber: 2,
  usedByCharacters: 3,
}

const renderDialog = (
  preview: {
    matched: boolean
    suggestedAction: "reuse" | "restore" | "new-version" | "new-book"
    book?: typeof baseBook
  },
) => {
  const onConfirm = vi.fn()
  render(
    <I18nProvider initialLocale="es">
      <LorebookRestoreDialog
        open
        preview={preview}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    </I18nProvider>,
  )
  return { onConfirm }
}

afterEach(() => {
  cleanup()
})

describe("LorebookRestoreDialog", () => {
  it("asks for confirmation before restoring a deleted matching book", async () => {
    const { onConfirm } = renderDialog({
      matched: true,
      suggestedAction: "restore",
      book: { ...baseBook, deleted: true },
    })

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/Bosque de Lyra/i)
    expect(dialog).toHaveTextContent(/3 personajes/i)
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: /Restaurar/i }),
    )

    expect(onConfirm).toHaveBeenCalledWith("restore")
  })

  it("lets the user create a new version from a live but different book", async () => {
    const { onConfirm } = renderDialog({
      matched: true,
      suggestedAction: "new-version",
      book: baseBook,
    })

    await screen.findByRole("dialog")
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: /Crear (una )?versión nueva/i }),
    )

    expect(onConfirm).toHaveBeenCalledWith("new-version")
  })

  it("lets the user reuse an identical live book without writing", async () => {
    const { onConfirm } = renderDialog({
      matched: true,
      suggestedAction: "reuse",
      book: baseBook,
    })

    await screen.findByRole("dialog")
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: /Reutilizar/i }),
    )

    expect(onConfirm).toHaveBeenCalledWith("reuse")
  })
})
