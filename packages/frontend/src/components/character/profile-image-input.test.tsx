import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render as rtlRender, screen, cleanup, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { ProfileImageInput } from "./profile-image-input"

vi.mock("react-easy-crop", () => ({
  __esModule: true,
  default: () => null,
}))

class MockImage {
  onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null
  set src(_value: string) {
    queueMicrotask(() => this.onload?.(new Event("load")))
  }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-preview")
  URL.revokeObjectURL = vi.fn()
  window.Image = MockImage as unknown as typeof Image
})

afterEach(() => {
  cleanup()
})

const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", {
  type: "image/png",
})

const renderDropzone = (props: Partial<Parameters<typeof ProfileImageInput>[0]> = {}) => {
  const handlers = {
    onFileSelected: vi.fn(),
    onClear: vi.fn(),
  }
  render(
    <ProfileImageInput
      characterId="char-1"
      name="Test"
      profileImageAssetId={null}
      pendingFile={null}
      onFileSelected={handlers.onFileSelected}
      onClear={handlers.onClear}
      {...props}
    />,
  )
  return handlers
}

describe("ProfileImageInput", () => {
  it("renders the dropzone with helper text", () => {
    renderDropzone()
    expect(screen.getByText(/Arrastra una imagen aquí/)).toBeInTheDocument()
    expect(screen.getByText(/PNG, JPEG, WEBP o GIF · máximo 3 MB/)).toBeInTheDocument()
  })

  it("opens the cropper dialog when a valid file is dropped", async () => {
    const handlers = renderDropzone()
    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pngFile] } })

    expect(await screen.findByText("Recortar imagen")).toBeInTheDocument()
    expect(handlers.onFileSelected).not.toHaveBeenCalled()
  })

  it("closes the cropper dialog and does not select the file on cancel", async () => {
    const handlers = renderDropzone()
    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pngFile] } })
    await screen.findByText("Recortar imagen")

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(handlers.onFileSelected).not.toHaveBeenCalled()
    expect(screen.queryByText("Recortar imagen")).not.toBeInTheDocument()
  })

  it("rejects an oversized file and does not call onFileSelected", async () => {
    const bigFile = new File([new Uint8Array(4 * 1024 * 1024)], "big.png", {
      type: "image/png",
    })
    const handlers = renderDropzone()
    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })

    fireEvent.drop(dropzone, { dataTransfer: { files: [bigFile] } })

    expect(handlers.onFileSelected).not.toHaveBeenCalled()
  })

  it("rejects a disallowed mime type", async () => {
    const svgFile = new File(["<svg></svg>"], "icon.svg", {
      type: "image/svg+xml",
    })
    const handlers = renderDropzone()
    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })

    fireEvent.drop(dropzone, { dataTransfer: { files: [svgFile] } })

    expect(handlers.onFileSelected).not.toHaveBeenCalled()
  })

  it("opens the cropper dialog when a file is chosen via the picker", async () => {
    const handlers = renderDropzone()
    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })

    await userEvent.click(dropzone)
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()

    fireEvent.change(input!, { target: { files: [pngFile] } })
    expect(await screen.findByText("Recortar imagen")).toBeInTheDocument()
    expect(handlers.onFileSelected).not.toHaveBeenCalled()
  })

  it("shows the asset URL preview when profileImageAssetId is set", async () => {
    renderDropzone({ profileImageAssetId: "asset-abc" })
    const img = await screen.findByAltText<HTMLImageElement>("Test")
    expect(img.src).toContain("/api/characters/char-1/assets/asset-abc")
  })

  it("shows the pending-file note when pendingFile is set", () => {
    renderDropzone({ pendingFile: pngFile })
    expect(screen.getByText(/Imagen pendiente de guardar/)).toBeInTheDocument()
  })

  it("calls onClear when the remove button is clicked", async () => {
    const handlers = renderDropzone({ profileImageAssetId: "asset-abc" })
    await userEvent.click(screen.getByText("Quitar imagen"))
    expect(handlers.onClear).toHaveBeenCalled()
  })
})
