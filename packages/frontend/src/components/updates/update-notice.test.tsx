import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { useUpdatesStore } from "@/lib/stores/updates.store"
import { UpdateNotice } from "./update-notice"

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
  canApply: true,
  blockedReason: null,
  checkError: null,
  checkedAt: "2026-10-07T10:00:00.000Z",
  job: null,
}

beforeEach(() => {
  useUpdatesStore.setState({ status: null, checking: false })
  mocks.checkUpdates.mockResolvedValue(behind)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("UpdateNotice", () => {
  it("muestra el aviso una vez cuando hay actualización", async () => {
    render(<UpdateNotice locale="es" />)

    expect(
      await screen.findByText("Actualización disponible"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Hay una versión nueva (2.0.0) disponible."),
    ).toBeInTheDocument()
  })

  it("al descartarlo guarda la versión y no vuelve a aparecer", async () => {
    render(<UpdateNotice locale="es" />)

    await userEvent.click(await screen.findByRole("button", { name: "Ahora no" }))

    expect(localStorage.getItem("rm_update_notified")).toBe("2.0.0")

    cleanup()
    useUpdatesStore.setState({ status: behind, checking: false })
    render(<UpdateNotice locale="es" />)

    expect(
      screen.queryByText("Actualización disponible"),
    ).not.toBeInTheDocument()
  })

  it("no muestra nada cuando está al día", async () => {
    mocks.checkUpdates.mockResolvedValue({
      ...behind,
      latestVersion: "1.0.0",
      behind: false,
      commits: [],
      canApply: false,
    })

    render(<UpdateNotice locale="es" />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(
      screen.queryByText("Actualización disponible"),
    ).not.toBeInTheDocument()
  })
})
