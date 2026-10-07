import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { ApiClientError } from "@/lib/api/client"
import { useUpdatesStore } from "@/lib/stores/updates.store"
import { UpdatesPanel } from "./updates-panel"

const mocks = vi.hoisted(() => ({
  getUpdateStatus: vi.fn(),
  checkUpdates: vi.fn(),
  applyUpdate: vi.fn(),
  createBackup: vi.fn(),
}))

vi.mock("@/lib/api/updates", () => ({
  getUpdateStatus: mocks.getUpdateStatus,
  checkUpdates: mocks.checkUpdates,
  applyUpdate: mocks.applyUpdate,
  createBackup: mocks.createBackup,
}))

const behind = {
  currentVersion: "1.0.0",
  latestVersion: "2.0.0",
  behind: true,
  commits: ["bbbbbbb feat: something"],
  notes: null,
  canApply: true,
  blockedReason: null,
  checkError: null,
  checkedAt: "2026-10-07T10:00:00.000Z",
  job: null,
}

const renderPanel = () => render(<UpdatesPanel locale="es" />)

beforeEach(() => {
  useUpdatesStore.setState({ status: null, checking: false })
  mocks.checkUpdates.mockResolvedValue(behind)
  mocks.getUpdateStatus.mockResolvedValue(behind)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("UpdatesPanel", () => {
  it("muestra las versiones y los cambios nuevos", async () => {
    renderPanel()

    expect(await screen.findByText("2.0.0")).toBeInTheDocument()
    expect(screen.getByText("1.0.0")).toBeInTheDocument()
    expect(screen.getByText("bbbbbbb feat: something")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Actualizar" }),
    ).toBeInTheDocument()
  })

  it("aplica la actualización con respaldo por defecto", async () => {
    mocks.applyUpdate.mockResolvedValue({
      ...behind,
      job: { running: true, step: "pull", message: null },
    })
    renderPanel()

    await userEvent.click(
      await screen.findByRole("button", { name: "Actualizar" }),
    )

    await waitFor(() =>
      expect(mocks.applyUpdate).toHaveBeenCalledWith(true),
    )
  })

  it("crea un respaldo manual y muestra la ruta", async () => {
    mocks.createBackup.mockResolvedValue({
      path: "C:/backups/2026",
      files: 2,
      bytes: 10,
    })
    renderPanel()

    await userEvent.click(
      await screen.findByRole("button", { name: "Crear respaldo ahora" }),
    )

    expect(
      await screen.findByText("Respaldo creado en C:/backups/2026"),
    ).toBeInTheDocument()
  })

  it("bloquea la actualización si hay cambios locales", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      canApply: false,
      blockedReason: "dirty",
    })
    renderPanel()

    expect(
      await screen.findByText(
        "Tienes cambios locales; guárdalos o descártalos antes de actualizar.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeDisabled()
  })

  it("indica cuando la app está al día", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      latestVersion: "1.0.0",
      behind: false,
      commits: [],
      canApply: false,
    })
    renderPanel()

    expect(await screen.findByText("Estás al día.")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Actualizar" }),
    ).not.toBeInTheDocument()
  })

  it("explica que no hay repositorio de git", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      latestVersion: null,
      behind: false,
      commits: [],
      canApply: false,
      blockedReason: "not-a-repo",
    })
    renderPanel()

    expect(
      await screen.findByText(
        "La app no se ejecuta desde un clon de git, así que las actualizaciones automáticas no están disponibles.",
      ),
    ).toBeInTheDocument()
  })

  it("muestra las notas de la release cuando hay actualización", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      commits: [],
      notes: "## 2.0.0\n\n- Mejoras varias",
    })
    renderPanel()

    expect(
      await screen.findByText("Notas de la versión"),
    ).toBeInTheDocument()
    expect(screen.getByText(/Mejoras varias/)).toBeInTheDocument()
  })

  it("muestra el progreso de la descarga", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      job: { running: true, step: "download", message: "12.3 MB / 54.2 MB" },
    })
    renderPanel()

    expect(
      await screen.findByText("Descargando la actualización…"),
    ).toBeInTheDocument()
    expect(screen.getByText("12.3 MB / 54.2 MB")).toBeInTheDocument()
  })

  it("explica cuando la release no trae paquete para la plataforma", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      canApply: false,
      blockedReason: "no-asset",
    })
    renderPanel()

    expect(
      await screen.findByText(
        "La última versión no incluye un paquete para esta plataforma.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeDisabled()
  })

  it("traduce el error al intentar actualizar", async () => {
    mocks.applyUpdate.mockRejectedValue(
      new ApiClientError(409, "UPDATE_DIRTY_WORKTREE", "raw"),
    )
    renderPanel()

    await userEvent.click(
      await screen.findByRole("button", { name: "Actualizar" }),
    )

    expect(
      await screen.findByText(
        "Tienes cambios locales; guárdalos o descártalos antes de actualizar.",
      ),
    ).toBeInTheDocument()
  })
})
