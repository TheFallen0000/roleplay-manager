import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ConversationDetail } from "@workspace/shared/types/conversation"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ModelSelector } from "./model-selector"

const mocks = vi.hoisted(() => ({
  getModelContextWindow: vi.fn(),
  getModelCapabilities: vi.fn(),
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
  getModelCapabilities: mocks.getModelCapabilities,
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
  useProviderStore: (
    selector: (state: typeof mocks.providerState) => unknown
  ) => selector(mocks.providerState),
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
  compactionThreshold: 80,
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

const openaiConversation: ConversationDetail = {
  ...current,
  provider: "openai-compatible",
  model: "gpt-4o-mini",
  contextWindow: 8_192,
  maxTokens: 4_096,
}

const manualConversation: ConversationDetail = {
  ...current,
  contextWindow: 8_192,
}

const renderSelector = (
  conversation: ConversationDetail = current,
  onChange = vi.fn()
) =>
  render(
    <I18nProvider initialLocale="en">
      <ModelSelector current={conversation} onChange={onChange} />
    </I18nProvider>
  )

const buildCapabilitiesResult = (
  id: "ollama" | "openai-compatible",
  model: string,
  contextWindow: number
) => {
  const safetyMargin = Math.max(128, Math.floor((contextWindow * 5) / 100))
  return {
    id,
    model,
    capabilities: {
      identity: {
        provider: id,
        instanceId: null,
        normalizedModel: model.toLowerCase(),
      },
      contextWindow,
      contextWindowSource: "runtime-introspection" as const,
      contextWindowConfidence: "high" as const,
      maxOutputTokens: null,
      maxOutputTokensSource: null,
      maxOutputTokensConfidence: null,
      confidence: "high" as const,
      warnings: [],
    },
    workingWindow: {
      status: "ok" as const,
      contextWindow,
      outputReserve: 2_048,
      safetyMargin,
      workingWindow: contextWindow - 2_048 - safetyMargin,
      warnings: [],
    },
  }
}

const capabilitiesWithWorkingWindow = (
  status: "unknown" | "infeasible",
  workingWindow: number | null
) => {
  const base = buildCapabilitiesResult("ollama", "llama3", 32_768)
  return {
    ...base,
    workingWindow: { ...base.workingWindow, status, workingWindow },
  }
}

const detectedWindow = (model: string) => (model === "llama3" ? 32_768 : 65_536)

beforeEach(() => {
  mocks.getModelContextWindow.mockReset()
  mocks.getModelContextWindow.mockImplementation(
    async (id: "ollama" | "openai-compatible", model: string) => ({
      id,
      model,
      contextWindow: detectedWindow(model),
    })
  )
  mocks.getModelCapabilities.mockReset()
  mocks.getModelCapabilities.mockImplementation(
    async (id: "ollama" | "openai-compatible", model: string) =>
      buildCapabilitiesResult(id, model, detectedWindow(model))
  )
})

afterEach(cleanup)

describe("ModelSelector context window", () => {
  it("detects the window when a legacy conversation opens", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)

    await waitFor(() =>
      expect(mocks.getModelContextWindow).toHaveBeenCalledWith(
        "ollama",
        "llama3"
      )
    )
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contextWindow: 32_768,
          workingWindow: null,
        })
      )
    )
  })

  it("keeps a saved override instead of detecting again", () => {
    renderSelector({ ...current, contextWindow: 8_192 })

    expect(mocks.getModelContextWindow).not.toHaveBeenCalled()
  })

  it("updates the window from the capabilities result on Detect", async () => {
    const onChange = vi.fn()
    renderSelector(
      {
        ...current,
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        contextWindow: 8_192,
      },
      onChange
    )

    await userEvent.click(screen.getByRole("button", { name: "Detect" }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contextWindow: 65_536,
          workingWindow: null,
        })
      )
    )
    expect(mocks.getModelContextWindow).not.toHaveBeenCalled()
  })

  it("applies a preset over the detected window", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 32_768 })
      )
    )

    await userEvent.click(screen.getByRole("button", { name: "8k" }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contextWindow: 8_192,
        workingWindow: null,
      })
    )
  })

  it("keeps a typed context window when the model changes", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 32_768 })
      )
    )

    const windowInput = screen.getByLabelText("Window (tokens)")
    await userEvent.clear(windowInput)
    await userEvent.type(windowInput, "16384")

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contextWindow: 16_384,
          workingWindow: null,
        })
      )
    )

    fireEvent.change(screen.getByPlaceholderText("Select or type a model"), {
      target: { value: "qwen2.5" },
    })

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ model: "qwen2.5" })
      )
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contextWindow: 16_384,
        workingWindow: null,
      })
    )
  })

  it("replaces an auto-detected context window when the model changes", async () => {
    const onChange = vi.fn()
    renderSelector(current, onChange)

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 32_768 })
      )
    )

    fireEvent.change(screen.getByPlaceholderText("Select or type a model"), {
      target: { value: "qwen2.5" },
    })

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "qwen2.5",
          contextWindow: 65_536,
          workingWindow: null,
        })
      )
    )
  })
})

describe("ModelSelector capabilities detection", () => {
  it("uses the capabilities refresh for openai-compatible detection", async () => {
    renderSelector(openaiConversation)

    await userEvent.click(screen.getByRole("button", { name: "Detect" }))

    await waitFor(() =>
      expect(mocks.getModelCapabilities).toHaveBeenCalledWith(
        "openai-compatible",
        "gpt-4o-mini",
        undefined,
        expect.objectContaining({ refresh: true })
      )
    )
    expect(mocks.getModelContextWindow).not.toHaveBeenCalled()
  })

  it("forwards the reply budget without the saved window", async () => {
    renderSelector(openaiConversation)

    await waitFor(() =>
      expect(mocks.getModelCapabilities).toHaveBeenCalledWith(
        "openai-compatible",
        "gpt-4o-mini",
        undefined,
        {
          conversationOverride: { maxTokens: 4_096 },
        }
      )
    )
  })

  it("omits the conversation override when maxTokens is null", async () => {
    renderSelector({ ...current, maxTokens: null })

    await waitFor(() =>
      expect(mocks.getModelCapabilities).toHaveBeenCalled()
    )

    for (const call of mocks.getModelCapabilities.mock.calls) {
      expect(call[3]?.conversationOverride).toBeUndefined()
    }
  })

  it("omits the conversation override when maxTokens is zero", async () => {
    renderSelector({ ...current, maxTokens: 0 })

    await waitFor(() =>
      expect(mocks.getModelCapabilities).toHaveBeenCalled()
    )

    for (const call of mocks.getModelCapabilities.mock.calls) {
      expect(call[3]?.conversationOverride).toBeUndefined()
    }
  })

  it("applies the raw window and the safe working window", async () => {
    const onChange = vi.fn()
    renderSelector(manualConversation, onChange)

    const apply = await screen.findByRole("button", { name: /apply/i })
    await userEvent.click(apply)

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contextWindow: 32_768,
          workingWindow: 29_082,
        })
      )
    )
    expect(onChange).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 29_082 })
    )
    expect(onChange).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 2_048 })
    )
  })

  it("updates a manual window from the raw Detect probe", async () => {
    const onChange = vi.fn()
    renderSelector(manualConversation, onChange)

    await userEvent.click(screen.getByRole("button", { name: "Detect" }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contextWindow: 32_768,
          workingWindow: null,
        })
      )
    )
  })

  it("does not apply an unknown working window", async () => {
    mocks.getModelCapabilities.mockImplementation(async () =>
      capabilitiesWithWorkingWindow("unknown", null)
    )
    const onChange = vi.fn()
    renderSelector(manualConversation, onChange)

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 8_192 })
      )
    )
    const apply = await screen.findByRole("button", { name: /apply/i })
    expect(apply).toBeDisabled()
    await userEvent.click(apply)

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 8_192 })
    )
  })

  it("does not apply an infeasible working window", async () => {
    mocks.getModelCapabilities.mockImplementation(async () =>
      capabilitiesWithWorkingWindow("infeasible", 0)
    )
    const onChange = vi.fn()
    renderSelector(manualConversation, onChange)

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ contextWindow: 8_192 })
      )
    )
    const apply = await screen.findByRole("button", { name: /apply/i })
    expect(apply).toBeDisabled()
    await userEvent.click(apply)

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contextWindow: 8_192 })
    )
  })
})
