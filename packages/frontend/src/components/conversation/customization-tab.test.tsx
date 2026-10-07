import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render as rtlRender, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"

import type { ConversationDetail } from "@workspace/shared/types/conversation"

import { CustomizationTab } from "./customization-tab"
import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

const mocks = vi.hoisted(() => ({
  uploadConversationCustomImage: vi.fn(),
  setConversationCustomProfileImage: vi.fn(),
}))

let lastCropperProps: { open: boolean; onCropComplete: (file: File) => void } | null = null

vi.mock("@/lib/api/client", () => ({
  __esModule: true,
  uploadConversationCustomImage: mocks.uploadConversationCustomImage,
  getCharacterAssetUrl: (characterId: string, assetId: string) =>
    `/api/characters/${characterId}/assets/${assetId}`,
  ApiClientError: class extends Error {},
}))

vi.mock("@/lib/api/conversations", () => ({
  __esModule: true,
  setConversationCustomProfileImage: mocks.setConversationCustomProfileImage,
}))

vi.mock("@/components/shared/images/image-cropper-dialog", () => ({
  __esModule: true,
  ImageCropperDialog: (props: {
    open: boolean
    onCropComplete: (file: File) => void
  }) => {
    lastCropperProps = props
    return null
  },
}))

vi.mock("@/components/shared/images/image-cropper.utils", () => ({
  __esModule: true,
  blobToFile: (_blob: Blob, name: string) =>
    new File([_blob], name, { type: _blob.type }),
  fileToDataUrl: (_file: File) => Promise.resolve("data:image/png;base64,xx"),
  getCroppedImg: () => Promise.resolve(new Blob(["fake"], { type: "image/png" })),
}))

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

const baseConversation = (overrides: Partial<ConversationDetail> = {}): ConversationDetail => ({
  id: "conv-1",
  characterId: "char-1",
  characterName: "Test",
  profileImageAssetId: "character-image-1",
  title: null,
  titleSource: null,
  model: null,
  provider: "ollama",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  temperature: null,
  maxTokens: null,
  topP: null,
  frequencyPenalty: null,
  presencePenalty: null,
  stopSequences: [],
  memoryProposalMode: "auto",
  customProfileImageAssetId: null,
  memoryDecayMode: "silent",
  memoryDecayThreshold: 2.8,
  memoryDecayAgeThreshold: 14,
  memoryDecaySpeed: 0.75,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [],
  ...overrides,
})

const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", {
  type: "image/png",
})

const renderTab = (conversation: ConversationDetail) => {
  const onSettingsChanged = vi.fn()
  render(<CustomizationTab conversation={conversation} onSettingsChanged={onSettingsChanged} />)
  return { onSettingsChanged }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-preview")
  URL.revokeObjectURL = vi.fn()
  window.Image = MockImage as unknown as typeof Image

  mocks.uploadConversationCustomImage.mockReset()
  mocks.setConversationCustomProfileImage.mockReset()

  mocks.uploadConversationCustomImage.mockResolvedValue({
    assetId: "new-custom-1",
    characterId: "char-1",
    mimeType: "image/png",
    sizeBytes: 12,
  })
  mocks.setConversationCustomProfileImage.mockImplementation(
    async (id: string, assetId: string | null): Promise<ConversationDetail> => ({
      ...baseConversation({ id }),
      customProfileImageAssetId: assetId,
      profileImageAssetId: assetId ?? "character-image-1",
    }),
  )
})

afterEach(() => {
  cleanup()
})

describe("CustomizationTab", () => {
  it("renders the customization description", () => {
    renderTab(baseConversation())
    expect(screen.getByText(/Imagen de perfil personalizada/)).toBeInTheDocument()
    expect(screen.getByText(/solo se aplica a este chat/)).toBeInTheDocument()
  })

  it("does not show the clear button when no override is set", () => {
    renderTab(baseConversation())
    expect(screen.queryByText("Quitar imagen personalizada")).not.toBeInTheDocument()
  })

  it("shows the remove button and clears the override", async () => {
    const { onSettingsChanged } = renderTab(
      baseConversation({
        customProfileImageAssetId: "old-custom-1",
        profileImageAssetId: "old-custom-1",
      }),
    )
    await userEvent.click(screen.getByText("Quitar imagen personalizada"))

    await waitFor(() => {
      expect(mocks.setConversationCustomProfileImage).toHaveBeenCalledWith("conv-1", null)
    })
    await waitFor(() => {
      expect(onSettingsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ customProfileImageAssetId: null }),
      )
    })
  })

  it("uploads and applies a cropped image on the full flow", async () => {
    const { onSettingsChanged } = renderTab(baseConversation())
    const croppedFile = new File(["cropped"], "cropped.png", { type: "image/png" })

    const dropzone = screen.getByRole("button", { name: /Subir imagen de perfil/ })
    fireEvent.drop(dropzone, { dataTransfer: { files: [pngFile] } })

    await waitFor(() => {
      expect(lastCropperProps?.open).toBe(true)
    })

    await act(async () => {
      lastCropperProps?.onCropComplete(croppedFile)
    })

    await waitFor(() => {
      expect(mocks.uploadConversationCustomImage).toHaveBeenCalledWith("conv-1", croppedFile)
    })
    await waitFor(() => {
      expect(mocks.setConversationCustomProfileImage).toHaveBeenCalledWith("conv-1", "new-custom-1")
    })
    await waitFor(() => {
      expect(onSettingsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ customProfileImageAssetId: "new-custom-1" }),
      )
    })
  })
})