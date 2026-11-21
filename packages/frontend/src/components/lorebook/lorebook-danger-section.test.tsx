import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deleteLorebook: vi.fn(),
}))

vi.mock("@/lib/api/lorebooks", () => ({
  deleteLorebook: mocks.deleteLorebook,
}))

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { LorebookDangerSection } from "./lorebook-danger-section"

interface LocationStub {
  href: string
  assign: ReturnType<typeof vi.fn>
}

const renderSection = () =>
  render(
    <I18nProvider initialLocale="es">
      <LorebookDangerSection
        lorebookId="book-1"
        lorebookName="Bosque de Lyra"
      />
    </I18nProvider>,
  )

const locationStub = (): LocationStub => globalThis.location as unknown as LocationStub

beforeEach(() => {
  mocks.deleteLorebook.mockReset()
  mocks.deleteLorebook.mockResolvedValue(undefined)
  vi.stubGlobal("location", { href: "", assign: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe("LorebookDangerSection", () => {
  it("warns about the consequences before deleting the lorebook", async () => {
    renderSection()

    await userEvent.click(
      screen.getByRole("button", { name: /Eliminar lorebook|Eliminar/i }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/Se eliminará/i)
    expect(dialog).toHaveTextContent(/Bosque de Lyra/i)
    expect(dialog).toHaveTextContent(/conservarán su copia/i)
    expect(dialog).toHaveTextContent(
      /no podrás consultar qué personajes lo usaban/i,
    )
    expect(mocks.deleteLorebook).not.toHaveBeenCalled()
  })

  it("soft-deletes on confirm and navigates back to the shelf", async () => {
    renderSection()

    await userEvent.click(
      screen.getByRole("button", { name: /Eliminar lorebook|Eliminar/i }),
    )
    const dialog = await screen.findByRole("dialog")

    await userEvent.click(
      within(dialog).getByRole("button", { name: /Eliminar/i }),
    )

    await waitFor(() =>
      expect(mocks.deleteLorebook).toHaveBeenCalledWith("book-1"),
    )
    await waitFor(() => {
      const location = locationStub()
      const navigated =
        location.href === "/lorebooks" ||
        location.assign.mock.calls.some(([target]) => target === "/lorebooks")
      expect(navigated).toBe(true)
    })
  })
})
