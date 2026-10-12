import { afterEach, describe, expect, it, vi } from "vitest"

import type { LogEntryDTO } from "@workspace/shared/types/log"

import { useLogsStore } from "./logs.store"

const mocks = vi.hoisted(() => ({
  getRecentLogs: vi.fn(),
}))

vi.mock("@/lib/api/logs", () => ({
  getRecentLogs: mocks.getRecentLogs,
  getLogsDownloadUrl: vi.fn(() => "/api/logs/download"),
}))

const entry: LogEntryDTO = {
  time: "2026-10-12T10:00:00.000Z",
  level: "info",
  message: "request completed",
}

afterEach(() => {
  useLogsStore.setState({ entries: [], refreshing: false })
  vi.clearAllMocks()
})

describe("useLogsStore", () => {
  it("loads the entries with the requested level", async () => {
    mocks.getRecentLogs.mockResolvedValue({ entries: [entry] })

    await useLogsStore.getState().refresh({ level: "warn" })

    expect(useLogsStore.getState().entries).toEqual([entry])
    expect(useLogsStore.getState().refreshing).toBe(false)
    expect(mocks.getRecentLogs).toHaveBeenCalledWith({
      limit: 300,
      level: "warn",
    })
  })

  it("asks for every level by default", async () => {
    mocks.getRecentLogs.mockResolvedValue({ entries: [] })

    await useLogsStore.getState().refresh()

    expect(mocks.getRecentLogs).toHaveBeenCalledWith({ limit: 300 })
  })

  it("clears the refreshing flag and rethrows when the logs fail", async () => {
    mocks.getRecentLogs.mockRejectedValue(new Error("nope"))

    await expect(useLogsStore.getState().refresh()).rejects.toThrow("nope")
    expect(useLogsStore.getState().refreshing).toBe(false)
  })
})
