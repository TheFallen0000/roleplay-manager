import { describe, it, expect, vi, afterEach } from "vitest"
import { render as rtlRender, screen, cleanup, fireEvent } from "@testing-library/react"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { ImageCropperDialog } from "./image-cropper-dialog"

vi.mock("react-easy-crop", async () => {
  const React = await import("react")
  function MockCropper({
    onCropComplete,
  }: {
    onCropComplete?: (area: unknown, areaPixels: unknown) => void
  }) {
    React.useEffect(() => {
      onCropComplete?.(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 50, height: 50 },
      )
    }, [onCropComplete])
    return React.createElement("div", { "data-testid": "mock-cropper" })
  }
  return {
    __esModule: true,
    default: MockCropper,
  }
})

afterEach(() => {
  cleanup()
  document.body.querySelectorAll("[data-base-ui-portal]").forEach((el) => el.remove())
  document.body.querySelectorAll("[data-base-ui-inert]").forEach((el) => el.remove())
})

const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", {
  type: "image/png",
})

const renderDialog = (props: Partial<Parameters<typeof ImageCropperDialog>[0]> = {}) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onCropComplete: vi.fn(),
  }
  render(
    <ImageCropperDialog
      open={true}
      onOpenChange={handlers.onOpenChange}
      file={pngFile}
      onCropComplete={handlers.onCropComplete}
      {...props}
    />,
  )
  return handlers
}

describe("ImageCropperDialog", () => {
  it("renders the crop dialog with title and actions", () => {
    renderDialog()
    expect(screen.getByText("Recortar imagen")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Aplicar/ })).toBeInTheDocument()
  })

  it("disables apply until the crop completes", () => {
    renderDialog()
    expect(screen.getByRole("button", { name: /Aplicar/ })).toBeDisabled()
  })

  it("closes without cropping when cancel is clicked", () => {
    const handlers = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(handlers.onOpenChange).toHaveBeenCalledWith(false)
    expect(handlers.onCropComplete).not.toHaveBeenCalled()
  })

  it("renders no cropper or actions when no file is provided", () => {
    renderDialog({ file: null })
    expect(screen.getByText("Recortar imagen")).toBeInTheDocument()
    expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Aplicar/ })).not.toBeInTheDocument()
  })
})
