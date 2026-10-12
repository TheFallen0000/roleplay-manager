import { describe, expect, it, vi } from "vitest"

import type { LogEntryDTO } from "@workspace/shared/types/log"

import type { LogReader } from "../../../domain/ports/log-reader"
import { GetRecentLogsUseCase } from "./get-recent-logs.use-case"
import { ListLogFilesUseCase } from "./list-log-files.use-case"

const entry: LogEntryDTO = {
  time: "2026-10-12T10:00:00.000Z",
  level: "info",
  message: "hello",
}

const buildReader = (): LogReader => ({
  readRecent: vi.fn(async () => [entry]),
  listFiles: vi.fn(async () => ["a.log", "b.log"]),
})

describe("GetRecentLogsUseCase", () => {
  it("delegates to the reader with the requested options", async () => {
    const reader = buildReader()

    const result = await new GetRecentLogsUseCase(reader).execute({
      limit: 50,
      level: "warn",
    })

    expect(result).toEqual([entry])
    expect(reader.readRecent).toHaveBeenCalledWith({ limit: 50, level: "warn" })
  })
})

describe("ListLogFilesUseCase", () => {
  it("returns the reader file list", async () => {
    const reader = buildReader()

    expect(await new ListLogFilesUseCase(reader).execute()).toEqual([
      "a.log",
      "b.log",
    ])
  })
})
