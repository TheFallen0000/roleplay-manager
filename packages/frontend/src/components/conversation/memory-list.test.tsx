import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemoryDTO } from "@workspace/shared/types/memory"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { MemoryList } from "./memory-list"

const mocks = vi.hoisted(() => ({
  listPlayerCharacters: vi.fn(),
  memories: [] as MemoryDTO[],
  createMemory: vi.fn(),
  updateMemory: vi.fn(),
  deleteMemory: vi.fn(),
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
      createMemory: mocks.createMemory,
      updateMemory: mocks.updateMemory,
      deleteMemory: mocks.deleteMemory,
      loadMemories: vi.fn(),
    }),
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
  type: MemoryDTO["type"] = "fact",
): MemoryDTO => ({
  id,
  conversationId: "conv-1",
  actor,
  title,
  description: `descripción de ${id}`,
  priority,
  type,
  createdBy: "assistant",
  updatedBy: "assistant",
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  turnsSinceUpdate: 0,
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
  contextPolicy: "balanced",
  customProfileImageAssetId: null,
  backgroundImageAssetId: null,
  backgroundFit: "cover",
  backgroundScrim: 0,
  messageStyle: "bubble",
  characterDialogueColor: null,
  userDialogueColor: null,
  memoryDecayMode: "silent",
  memoryDecayThreshold: 2.8,
  memoryDecayAgeThreshold: 14,
  memoryDecaySpeed: 0.75,
  playerCharacterId: "pc-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [],
  messagesHasMore: false,
  messagesNextCursor: null,
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
  mocks.createMemory.mockReset()
  mocks.createMemory.mockResolvedValue({})
  mocks.updateMemory.mockReset()
  mocks.updateMemory.mockResolvedValue({})
  mocks.deleteMemory.mockReset()
  mocks.deleteMemory.mockResolvedValue(undefined)
  mocks.memories = [
    memory("m1", "Lyra", "Bosque de Vael", 8, "fact"),
    memory("m2", "Lyra", "Poción de la luna", 3, "thread"),
    memory("m3", "Auron", "Cicatriz en el brazo", 6, "episode"),
    memory("m4", "Marcus", "Deuda pendiente", 5, "fact"),
  ]
  localStorage.clear()
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

  it("shows a type badge for every memory", async () => {
    renderList()

    await userEvent.click(screen.getByRole("button", { name: /Lyra/ }))

    expect(await screen.findByText(/^Hecho/)).toBeVisible()
    expect(screen.getByText(/^Hilo/)).toBeVisible()
  })

  it("filters the memories by type", async () => {
    renderList()

    await userEvent.click(
      screen.getByRole("combobox", { name: "Filtrar por tipo" }),
    )
    await userEvent.click(await screen.findByRole("option", { name: /^Hilo/ }))

    const lyra = screen.getByRole("button", { name: /Lyra/ })
    if (lyra.getAttribute("aria-expanded") === "false") {
      await userEvent.click(lyra)
    }

    expect(await screen.findByText("Poción de la luna")).toBeVisible()
    expect(screen.queryByText("Bosque de Vael")).not.toBeInTheDocument()
  })

  it("lets the user choose the type when creating a memory", async () => {
    renderList()

    await userEvent.click(screen.getByRole("button", { name: "Crear memoria" }))
    const dialog = screen.getByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Actor"), "Lyra")
    await userEvent.type(within(dialog).getByLabelText("Título"), "Promesa")
    await userEvent.type(
      within(dialog).getByLabelText("Descripción"),
      "Volverá en invierno.",
    )
    await userEvent.click(
      within(dialog).getByRole("combobox", { name: "Tipo" }),
    )
    await userEvent.click(await screen.findByRole("option", { name: /^Hilo/ }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear" }))

    await waitFor(() =>
      expect(mocks.createMemory).toHaveBeenCalledWith(
        "conv-1",
        expect.objectContaining({
          actor: "Lyra",
          title: "Promesa",
          type: "thread",
        }),
      ),
    )
  })
})
