import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ConversationDetail } from "@workspace/shared/types/conversation"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ModelSelector } from "./model-selector"

const mocks = vi.hoisted(() => ({
  getModelContextWindow: vi.fn(),
  load: vi.fn(async () => {}),
  verifyOllama: vi.fn(async () => ({ ok: true, models: [] })),
  providerState: {
    registeredIds: ["ollama"],
    instances: [],
    runtimes: {
      ollama: {
        status: "available",
        message: undefined,
        verifying: false,
        models: [{ id: "llama3", name: "llama3" }],
        modelsLoading: false,
      },
    },
    load: vi.fn(async () => {}),
    createInstance: vi.fn(),
    updateInstance: vi.fn(),
    deleteInstance: vi.fn(),
    verifyOllama: vi.fn(async () => ({ ok: true, models: [] })),
    verifyInstance: vi.fn(),
  },
}))

vi.mock("@/lib/api/providers", () => ({
  getModelContextWindow: mocks.getModelContextWindow,
}))

vi.mock("@/lib/stores/provider.store", () => ({
  EMPTY_PROVIDER_RUNTIME: {
    status: "unknown",
    message: undefined,
    verifying: false,
    models: [],
    modelsLoading: false,
  },
  OLLAMA_KEY: "ollama",
  useProviderStore: (selector: (state: typeof mocks.providerState) => unknown) =>
    selector(mocks.providerState),
}))

const current: ConversationDetail = {
  id: "conv-1",
  characterId: "char-1",
  characterName: "Test",
  profileImageAssetId: null,
  title: null,
  titleSource: null,
  model: "llama3",
  provider: "ollama",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  contextWindow: null,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  customProfileImageAssetId: null,
  backgroundImageAssetId: null,
  backgroundFit: "cover",
  backgroundScrim: 0,
  messageStyle: "bubble",
  characterDialogueColor: null,
  userDialogueColor: null,
  playerCharacterId: null,
  memoryDecayMode: "silent",
  memoryDecayThreshold: 3,
  memoryDecayAgeThreshold: 30,
  memoryDecaySpeed: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [],
  messagesHasMore: false,
  messagesNextCursor: null,
}

const renderSelector = (
  conversation: ConversationDetail = current,
  onChange = vi.fn(),
) =>
  render(
    <I18nProvider initialLocale="en">
      <ModelSelector current={conversation} onChange={onChange} />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.getModelContextWindow.mockReset()
  mocks.getModelContextWindow.mockResolvedValue({
    id: "ollama",
    model: "llama3",
    contextWindow: 32_768,
  })
})

afterEach(cleanup)

describe("ModelSelector context window", () => {
  it("detects the window when a legacy conversation opens", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)

    await waitFor(() =>
      expect(mocks.getModelContextWindow).toHaveBeenCalledWith(
        "ollama",
        "llama3",
      ),
    )
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 32_768 }),
      ),
    )
  })

  it("keeps a saved override instead of detecting again", () => {
    renderSelector({ ...current, contextWindow: 8_192 })

    expect(mocks.getModelContextWindow).not.toHaveBeenCalled()
  })

  it("does not erase a manual preset when the provider cannot detect", async () => {
    const onChange = vi.fn()
    renderSelector(
      {
        ...current,
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        contextWindow: 8_192,
      },
      onChange,
    )

    await userEvent.click(screen.getByRole("button", { name: "Detect" }))

    expect(mocks.getModelContextWindow).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 8_192 }),
    )
  })

  it("applies a preset over the detected window", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 32_768 }),
      ),
    )

    await userEvent.click(screen.getByRole("button", { name: "8k" }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 8_192 }),
    )
  })
})
