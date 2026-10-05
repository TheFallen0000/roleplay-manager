import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import type * as React from "react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import { PlayerCharacterCard } from "./player-character-card"
import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

const alice: PlayerCharacterDTO = {
  id: "pc-1",
  name: "Alice",
  description: "Una exploradora curiosa.",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
}

const conversation: ConversationDetail = {
  id: "conv-1",
  characterId: "char-1",
  characterName: "Lyra",
  profileImageAssetId: null,
  title: null,
  titleSource: null,
  model: null,
  provider: null,
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  customProfileImageAssetId: null,
  playerCharacterId: null,
  memoryDecayMode: "silent",
  memoryDecayThreshold: 3,
  memoryDecayAgeThreshold: 30,
  memoryDecaySpeed: 10,
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
  messages: [],
}

const mocks = vi.hoisted(() => ({
  listPlayerCharacters: vi.fn(),
  updateConversationSettings: vi.fn(),
}))

vi.mock("@/lib/api/player-characters", () => ({
  listPlayerCharacters: mocks.listPlayerCharacters,
  createPlayerCharacter: vi.fn(),
  updatePlayerCharacter: vi.fn(),
  deletePlayerCharacter: vi.fn(),
}))

vi.mock("@/lib/api/conversations", () => ({
  updateConversationSettings: mocks.updateConversationSettings,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  mocks.listPlayerCharacters.mockReset()
  mocks.updateConversationSettings.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("PlayerCharacterCard", () => {
  it("guarda la persona elegida en la conversación", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])
    mocks.updateConversationSettings.mockResolvedValue({
      ...conversation,
      playerCharacterId: "pc-1",
    })

    const onSettingsChanged = vi.fn()
    render(
      <PlayerCharacterCard
        conversation={conversation}
        onSettingsChanged={onSettingsChanged}
      />,
    )

    await screen.findByText("Ninguna")

    const user = userEvent.setup()
    await user.click(screen.getByLabelText("Persona"))
    await user.click(await screen.findByRole("option", { name: "Alice" }))

    fireEvent.click(screen.getByText("Aplicar"))

    await waitFor(() =>
      expect(mocks.updateConversationSettings).toHaveBeenCalledWith("conv-1", {
        playerCharacterId: "pc-1",
      }),
    )
    await waitFor(() =>
      expect(onSettingsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ playerCharacterId: "pc-1" }),
      ),
    )
  })

  it("muestra la persona ya asignada", async () => {
    mocks.listPlayerCharacters.mockResolvedValue([alice])

    render(
      <PlayerCharacterCard
        conversation={{ ...conversation, playerCharacterId: "pc-1" }}
        onSettingsChanged={vi.fn()}
      />,
    )

    expect(await screen.findByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Una exploradora curiosa.")).toBeInTheDocument()
  })
})
