import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render as rtlRender,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"

const mocks = vi.hoisted(() => ({
  uploadConversationBackground: vi.fn(),
  updateConversationSettings: vi.fn(),
}))

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>()
  return {
    ...actual,
    uploadConversationBackground: mocks.uploadConversationBackground,
    getCharacterAssetUrl: (
      characterId: string,
      assetId: string,
      variant?: string,
    ) =>
      `http://localhost:3001/api/characters/${characterId}/assets/${assetId}${
        variant ? `?variant=${variant}` : ""
      }`,
  }
})

vi.mock("@/lib/api/conversations", () => ({
  updateConversationSettings: mocks.updateConversationSettings,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock("react-easy-crop", () => ({
  __esModule: true,
  default: () => null,
}))

import { BackgroundImageInput } from "./background-image-input"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const baseConversation = (
  overrides: Partial<ConversationDetail> = {},
): ConversationDetail =>
  ({
    id: "conv-1",
    characterId: "char-1",
    characterName: "Lyra",
    backgroundImageAssetId: null,
    backgroundImageDimensions: null,
    backgroundFit: "cover",
    backgroundScrim: 0,
    ...overrides,
  }) as ConversationDetail

const renderInput = (conversation: ConversationDetail) => {
  const onSettingsChanged = vi.fn()
  render(
    <BackgroundImageInput
      conversation={conversation}
      onSettingsChanged={onSettingsChanged}
    />,
  )
  return { onSettingsChanged }
}

describe("BackgroundImageInput", () => {
  it("shows the empty state when there is no background", () => {
    renderInput(baseConversation())

    expect(screen.getByText("Añadir fondo")).toBeInTheDocument()
    expect(screen.queryByText("Quitar fondo")).not.toBeInTheDocument()
  })

  it("removes the background and notifies the new settings", async () => {
    const updated = baseConversation({ backgroundImageAssetId: null })
    mocks.updateConversationSettings.mockResolvedValue(updated)
    const { onSettingsChanged } = renderInput(
      baseConversation({
        backgroundImageAssetId: "asset-bg",
        backgroundImageDimensions: { width: 1920, height: 1080 },
      }),
    )

    expect(screen.getByText("Cambiar imagen")).toBeInTheDocument()
    await userEvent.click(screen.getByText("Quitar fondo"))

    await waitFor(() =>
      expect(mocks.updateConversationSettings).toHaveBeenCalledWith("conv-1", {
        backgroundImageAssetId: null,
      }),
    )
    expect(onSettingsChanged).toHaveBeenCalledWith(updated)
  })

  it("opens the cropper when a valid image is dropped", async () => {
    renderInput(baseConversation())

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "bg.png", {
      type: "image/png",
    })
    fireEvent.drop(screen.getByText("Añadir fondo").closest("button")!, {
      dataTransfer: { files: [file] },
    })

    expect(await screen.findByText("Recortar imagen")).toBeInTheDocument()
  })

  it("rejects disallowed file types without opening the cropper", () => {
    renderInput(baseConversation())

    const file = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" })
    fireEvent.drop(screen.getByText("Añadir fondo").closest("button")!, {
      dataTransfer: { files: [file] },
    })

    expect(screen.queryByText("Recortar imagen")).not.toBeInTheDocument()
  })
})
