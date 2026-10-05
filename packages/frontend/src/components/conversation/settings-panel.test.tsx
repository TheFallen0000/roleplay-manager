import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render as rtlRender, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react"
import type * as React from "react"
import userEvent from "@testing-library/user-event"

import type { ConversationDetail } from "@workspace/shared/types/conversation"

import { SettingsPanel } from "./settings-panel"
import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

const mocks = vi.hoisted(() => ({
  updateConversationSettings: vi.fn(),
}))

vi.mock("@/lib/api/conversations", () => ({
  __esModule: true,
  updateConversationSettings: mocks.updateConversationSettings,
}))

vi.mock("@/lib/stores/memory.store", () => ({
  __esModule: true,
  useMemoryStore: (selector: (state: { proposals: { status: string }[] }) => unknown) =>
    selector({ proposals: [] }),
}))

vi.mock("@/lib/stores/summary.store", () => ({
  __esModule: true,
  useSummaryStore: (selector: (state: { summaries: unknown[] }) => unknown) =>
    selector({ summaries: [] }),
}))

vi.mock("./model-selector", () => ({
  __esModule: true,
  ModelSelector: () => <div data-testid="model-selector" />,
}))

vi.mock("./customization-tab", () => ({
  __esModule: true,
  CustomizationTab: () => <div data-testid="customization-tab" />,
}))

vi.mock("../summary/summary-viewer", () => ({
  __esModule: true,
  SummaryViewer: () => null,
}))

vi.mock("../memory/proposal-list", () => ({
  __esModule: true,
  ProposalList: () => null,
}))

vi.mock("../memory/memory-list", () => ({
  __esModule: true,
  MemoryList: () => null,
}))

vi.mock("../memory/memory-decay-card", () => ({
  __esModule: true,
  MemoryDecayCard: () => null,
}))

const baseConversation = (overrides: Partial<ConversationDetail> = {}): ConversationDetail => ({
  id: "conv-1",
  characterId: "char-1",
  characterName: "Test",
  profileImageAssetId: null,
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

const renderPanel = () => {
  const onSettingsChanged = vi.fn()
  render(
    <SettingsPanel
      conversationId="conv-1"
      current={baseConversation()}
      onSettingsChanged={onSettingsChanged}
    >
      <button type="button">Settings</button>
    </SettingsPanel>,
  )
  return { onSettingsChanged }
}

const openMenu = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Settings" }))
}

const openSection = async (menuItem: string) => {
  await openMenu()
  await userEvent.click(await screen.findByRole("menuitem", { name: menuItem }))
}

beforeEach(() => {
  mocks.updateConversationSettings.mockReset()
  mocks.updateConversationSettings.mockImplementation(
    async (_id: string, settings: Record<string, unknown>) =>
      ({ ...baseConversation(), ...settings }) as ConversationDetail,
  )
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe("SettingsPanel", () => {
  it("shows the three sections when the trigger is opened", async () => {
    renderPanel()
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Historia" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Modelo" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Personalización" })).toBeInTheDocument()
  })

  it("opens the Historia dialog with the accordion and a footer", async () => {
    renderPanel()
    await openSection("Historia")

    const dialog = screen.getByRole("dialog", { name: "Historia del chat" })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Modo de gestión de memorias/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restablecer valores" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aplicar cambios" })).toBeInTheDocument()
  })

  it("keeps the Historia accordion closed by default and opens items on click", async () => {
    renderPanel()
    await openSection("Historia")

    expect(screen.queryByText("Modo de memorias")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Modo de gestión de memorias/ }))
    expect(await screen.findByText("Modo de memorias")).toBeInTheDocument()
  })

  it("opens the Modelo dialog with the model selector and a footer", async () => {
    renderPanel()
    await openSection("Modelo")

    expect(screen.getByRole("dialog", { name: "Modelo" })).toBeInTheDocument()
    expect(screen.getByTestId("model-selector")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restablecer valores" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aplicar cambios" })).toBeInTheDocument()
  })

  it("opens the Personalización dialog without a footer", async () => {
    renderPanel()
    await openSection("Personalización")

    expect(screen.getByRole("dialog", { name: "Personalización" })).toBeInTheDocument()
    expect(screen.getByTestId("customization-tab")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aplicar cambios" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Restablecer valores" })).not.toBeInTheDocument()
  })

  it("saves model settings from the Modelo dialog", async () => {
    const { onSettingsChanged } = renderPanel()
    await openSection("Modelo")

    const maxTokens = screen.getByLabelText<HTMLInputElement>("Max tokens")
    fireEvent.change(maxTokens, { target: { value: "5555" } })

    await userEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }))

    await waitFor(() => {
      expect(mocks.updateConversationSettings).toHaveBeenCalledWith("conv-1", {
        maxTokens: 5555,
      })
    })
    await waitFor(() => {
      expect(onSettingsChanged).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 5555 }),
      )
    })
  })

  it("resets model fields after confirmation", async () => {
    renderPanel()
    await openSection("Modelo")

    const maxTokens = screen.getByLabelText("Max tokens")
    fireEvent.change(maxTokens, { target: { value: "5555" } })

    await userEvent.click(screen.getByRole("button", { name: "Restablecer valores" }))

    const confirm = within(await screen.findByRole("dialog", { name: "Restablecer valores" }))
    await userEvent.click(confirm.getByRole("button", { name: "Restablecer" }))

    expect((screen.getByLabelText("Max tokens") as HTMLInputElement).value).toBe("2048")
  })

  it("saves summary frequency from the Historia dialog", async () => {
    renderPanel()
    await openSection("Historia")

    await userEvent.click(screen.getByRole("button", { name: /Resúmenes/ }))

    const frequency = await screen.findByLabelText("Frecuencia de resumen")
    fireEvent.change(frequency, { target: { value: "30" } })

    await userEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }))

    await waitFor(() => {
      expect(mocks.updateConversationSettings).toHaveBeenCalledWith("conv-1", {
        summaryFrequency: 30,
      })
    })
  })

  it("does not persist a last-opened-section value", async () => {
    renderPanel()
    await openSection("Modelo")

    expect(localStorage.getItem("settings-tab:conv-1")).toBeNull()
  })
})