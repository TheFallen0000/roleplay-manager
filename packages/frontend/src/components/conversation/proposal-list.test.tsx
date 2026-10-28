import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@workspace/ui/components/sonner"
import type { MemoryChangeProposalDTO } from "@workspace/shared/types/memory-change-proposal"
import type { MemoryDTO } from "@workspace/shared/types/memory"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ProposalList } from "./proposal-list"

const mocks = vi.hoisted(() => ({
  proposals: [] as MemoryChangeProposalDTO[],
  memories: [] as MemoryDTO[],
  applyProposals: vi.fn(),
  loadMemories: vi.fn(),
  loadProposals: vi.fn(),
}))

vi.mock("@/lib/stores/memory.store", () => ({
  useMemoryStore: (selector: (state: unknown) => unknown) =>
    selector({
      proposals: mocks.proposals,
      memories: mocks.memories,
      loading: false,
      applyProposals: mocks.applyProposals,
      loadMemories: mocks.loadMemories,
      loadProposals: mocks.loadProposals,
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

const memory = (overrides: Partial<MemoryDTO> = {}): MemoryDTO => ({
  id: "mem-1",
  conversationId: "conv-1",
  actor: "Aria",
  title: "Guardia",
  description: "Vigila la puerta.",
  priority: 7,
  createdBy: "assistant",
  updatedBy: "assistant",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  turnsSinceUpdate: 0,
  ...overrides,
})

const proposal = (
  overrides: Partial<MemoryChangeProposalDTO> = {},
): MemoryChangeProposalDTO => ({
  id: "prop-1",
  conversationId: "conv-1",
  operation: "CREATE",
  targetMemoryId: null,
  actor: "Aria",
  title: "Herida",
  description: "Corte en el brazo.",
  priority: 7,
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  processedAt: null,
  processedBy: "user",
  ...overrides,
})

const renderList = () =>
  render(
    <I18nProvider initialLocale="es">
      <ProposalList conversationId="conv-1" />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.proposals = []
  mocks.memories = []
  mocks.applyProposals.mockReset()
  mocks.applyProposals.mockResolvedValue([])
  mocks.loadMemories.mockReset()
  mocks.loadProposals.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
  vi.mocked(toast.info).mockReset()
})

afterEach(() => {
  cleanup()
})

describe("ProposalList", () => {
  it("muestra el diff de un UPDATE contra la memoria actual", () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        title: "Nueva guardia",
        description: "Vigila la puerta.",
        priority: 9,
      }),
    ]

    renderList()

    expect(screen.getByText("Actualizar")).toBeInTheDocument()
    expect(screen.getAllByText("Guardia").length).toBeGreaterThan(0)
    expect(screen.getByText("Nueva guardia")).toBeInTheDocument()
    expect(screen.getByText("Título:")).toBeInTheDocument()
    expect(screen.getAllByText("9").length).toBeGreaterThan(0)
    expect(screen.queryByText("Descripción:")).not.toBeInTheDocument()
  })

  it("desaconseja aceptar un UPDATE sin cambios", () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        title: "Guardia",
        description: "Vigila la puerta.",
        priority: 7,
      }),
    ]

    renderList()

    expect(
      screen.getByText("Esta propuesta no cambia ningún campo."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeDisabled()
  })

  it("oculta editar en DELETE y confirma antes de borrar", async () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        operation: "DELETE",
        targetMemoryId: "mem-1",
        title: "Guardia",
        description: "Vigila la puerta.",
      }),
    ]

    renderList()

    expect(screen.getByText("Eliminar")).toBeInTheDocument()
    expect(screen.queryByText("Editar y aceptar")).not.toBeInTheDocument()
    expect(screen.getByText("Vigila la puerta.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }))
    expect(screen.getByText("¿Eliminar memoria?")).toBeInTheDocument()

    const dialog = screen.getByRole("dialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar memoria" }),
    )

    await waitFor(() =>
      expect(mocks.applyProposals).toHaveBeenCalledWith("conv-1", [
        expect.objectContaining({ proposalId: "prop-1", action: "apply" }),
      ]),
    )
  })

  it("avisa y solo permite descartar cuando la memoria objetivo no existe", async () => {
    mocks.proposals = [
      proposal({
        operation: "UPDATE",
        targetMemoryId: "missing",
        title: "Fantasma",
      }),
    ]

    renderList()

    expect(
      screen.getByText("La memoria objetivo ya no existe. Descarta esta propuesta."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }))

    await waitFor(() =>
      expect(mocks.applyProposals).toHaveBeenCalledWith("conv-1", [
        { proposalId: "prop-1", action: "discard" },
      ]),
    )
  })

  it("aplica todo directamente cuando no hay borrados", async () => {
    mocks.proposals = [
      proposal({ id: "prop-1" }),
      proposal({ id: "prop-2", title: "Otra" }),
    ]

    renderList()

    await userEvent.click(screen.getByRole("button", { name: "Aceptar todo" }))

    await waitFor(() =>
      expect(mocks.applyProposals).toHaveBeenCalledWith("conv-1", [
        { proposalId: "prop-1", action: "apply" },
        { proposalId: "prop-2", action: "apply" },
      ]),
    )
    expect(screen.queryByText("¿Aceptar todas las propuestas?")).not.toBeInTheDocument()
  })

  it("pide confirmación al aceptar todo si hay borrados", async () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        id: "prop-1",
        operation: "DELETE",
        targetMemoryId: "mem-1",
        title: "Guardia",
      }),
      proposal({ id: "prop-2", title: "Herida" }),
    ]

    renderList()

    await userEvent.click(screen.getByRole("button", { name: "Aceptar todo" }))

    expect(
      screen.getByText("¿Aceptar todas las propuestas?"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Se eliminarán las siguientes memorias:"),
    ).toBeInTheDocument()
    expect(mocks.applyProposals).not.toHaveBeenCalled()

    const dialog = screen.getByRole("dialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Aceptar todo" }),
    )

    await waitFor(() =>
      expect(mocks.applyProposals).toHaveBeenCalledWith("conv-1", [
        { proposalId: "prop-1", action: "apply" },
        { proposalId: "prop-2", action: "apply" },
      ]),
    )
  })

  it("muestra la leyenda de prioridad", () => {
    mocks.proposals = [proposal()]

    renderList()

    expect(screen.getByText(/1-3 detalle menor/)).toBeInTheDocument()
  })

  it("no aplica una edición sin cambios", async () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        title: "Guardia",
        description: "Vigila la puerta.",
        priority: 7,
      }),
    ]

    renderList()

    await userEvent.click(
      screen.getByRole("button", { name: "Editar y aceptar" }),
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar cambios" }),
    )

    expect(toast.info).toHaveBeenCalledWith(
      "Esta propuesta no cambia ningún campo.",
    )
    expect(mocks.applyProposals).not.toHaveBeenCalled()
  })

  it("valida actor y título antes de aceptar cambios", async () => {
    mocks.memories = [memory()]
    mocks.proposals = [
      proposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        title: "Nueva guardia",
      }),
    ]

    renderList()

    await userEvent.click(
      screen.getByRole("button", { name: "Editar y aceptar" }),
    )

    await userEvent.clear(screen.getByLabelText("Actor"))
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar cambios" }),
    )

    expect(toast.error).toHaveBeenCalledWith(
      "El actor y el título son obligatorios.",
    )
    expect(mocks.applyProposals).not.toHaveBeenCalled()
  })
})
