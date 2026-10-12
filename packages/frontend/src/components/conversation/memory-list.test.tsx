import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemoryDTO } from "@workspace/shared/types/memory"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { MemoryList } from "./memory-list"

const mocks = vi.hoisted(() => ({
  listPlayerCharacters: vi.fn(),
  memories: [] as MemoryDTO[],
}))

vi.mock("@/lib/api/player-characters", () => ({
  listPlayerCharacters: mocks.listPlayerCharacters,
}))

vi.mock("@/lib/stores/memory.store", () => ({
  useMemoryStore: (selector: (state: unknown) => unknown) =>
    selector({
      memories: mocks.memories,
      loading: false,
      lastDecay: null,
      createMemory: vi.fn(),
      updateMemory: vi.fn(),
      deleteMemory: vi.fn(),
      loadMemories: vi.fn(),
    }),
}))

vi.mock("@/lib/stores/chat.store", () => ({
  useChatStore: (selector: (state: unknown) => unknown) =>
    selector({ messages: [] }),
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

const memory = (
  id: string,
  actor: string,
  title: string,
  priority: number,
): MemoryDTO => ({
  id,
  conversationId: "conv-1",
  actor,
  title,
  description: `descripción de ${id}`,
  priority,
  createdBy: "assistant",
  updatedBy: "assistant",
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
})

const conversation: ConversationDetail = {
  id: "conv-1",
  characterId: "char-1",
  characterName: "Lyra",
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
  playerCharacterId: "pc-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [],
}

const renderList = () =>
  render(
    <I18nProvider initialLocale="es">
      <MemoryList conversationId="conv-1" conversation={conversation} />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.listPlayerCharacters.mockReset()
  mocks.listPlayerCharacters.mockResolvedValue([
    { id: "pc-1", name: "Auron" },
  ])
  mocks.memories = [
    memory("m1", "Lyra", "Bosque de Vael", 8),
    memory("m2", "Lyra", "Poción de la luna", 3),
    memory("m3", "Auron", "Cicatriz en el brazo", 6),
    memory("m4", "Marcus", "Deuda pendiente", 5),
  ]
})

afterEach(cleanup)

describe("MemoryList", () => {
  it("summarises the memories and groups them by actor", async () => {
    renderList()

    expect(
      await screen.findByText("4 memorias · 3 actores"),
    ).toBeInTheDocument()

    const lyra = screen.getByRole("button", { name: /Lyra/ })
    expect(lyra).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Personaje")).toBeInTheDocument()
    expect(await screen.findByText("Tú")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Marcus/ })).toBeInTheDocument()
  })

  it("expands a group to show its memories", async () => {
    renderList()

    await userEvent.click(screen.getByRole("button", { name: /Lyra/ }))

    expect(await screen.findByText("Bosque de Vael")).toBeVisible()
    expect(screen.getByText("Poción de la luna")).toBeVisible()
    expect(screen.getByRole("button", { name: /Lyra/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("filters and auto-expands the matching groups when searching", async () => {
    renderList()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar por actor, título o descripción" }),
      "bosque",
    )

    expect(await screen.findByText("Bosque de Vael")).toBeVisible()
    expect(screen.getByRole("button", { name: /Lyra/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(screen.queryByText("Deuda pendiente")).not.toBeInTheDocument()
  })

  it("explains when nothing matches the search", async () => {
    renderList()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar por actor, título o descripción" }),
      "zzz",
    )

    expect(
      await screen.findByText("Ninguna memoria coincide con la búsqueda."),
    ).toBeInTheDocument()
  })
})
