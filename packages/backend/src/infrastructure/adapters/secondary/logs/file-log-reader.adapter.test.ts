import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { FileLogReader } from "./file-log-reader.adapter"

const line = (time: number, level: number, msg: string, extra = {}) =>
  JSON.stringify({ time, level, msg, pid: 1, hostname: "pc", service: "backend", ...extra })

let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "rm-logs-"))

  // Older file: rotation number 1.
  const older = join(dir, "app.1.log")
  await writeFile(
    older,
    [
      line(1_000, 20, "debug entry"),
      line(2_000, 30, "older info"),
      line(3_000, 50, "older error", { conversationId: "conv-1" }),
      "{ this line is a partial write",
      "",
    ].join("\n"),
    "utf8",
  )
  await utimes(older, new Date(1_000), new Date(1_000))

  // Newer file: rotation number 2.
  const newer = join(dir, "app.2.log")
  await writeFile(
    newer,
    [line(4_000, 30, "newer info"), line(5_000, 40, "newer warn")].join("\n"),
    "utf8",
  )
  await utimes(newer, new Date(2_000), new Date(2_000))

  // Noise that must be ignored.
  await writeFile(join(dir, "notes.txt"), "not a log", "utf8")
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe("FileLogReader", () => {
  it("returns entries from newest to oldest, skipping partial lines", async () => {
    const entries = await new FileLogReader(dir).readRecent({ limit: 10 })

    expect(entries.map((entry) => entry.message)).toEqual([
      "newer warn",
      "newer info",
      "older error",
      "older info",
      "debug entry",
    ])
    expect(entries[0]).toEqual({
      time: new Date(5_000).toISOString(),
      level: "warn",
      message: "newer warn",
    })
    expect(entries[2].context).toEqual({ conversationId: "conv-1" })
  })

  it("keeps only the requested level and above", async () => {
    const reader = new FileLogReader(dir)

    expect(
      (await reader.readRecent({ limit: 10, level: "warn" })).map((e) => e.level),
    ).toEqual(["warn", "error"])
    expect(
      (await reader.readRecent({ limit: 10, level: "info" })).map((e) => e.message),
    ).toEqual(["newer warn", "newer info", "older error", "older info"])
  })

  it("respects the limit", async () => {
    const entries = await new FileLogReader(dir).readRecent({ limit: 2 })

    expect(entries.map((entry) => entry.message)).toEqual([
      "newer warn",
      "newer info",
    ])
  })

  it("lists the log files oldest first for the download", async () => {
    const files = await new FileLogReader(dir).listFiles()

    expect(files.map((file) => file.split(/[\\/]/).pop())).toEqual([
      "app.1.log",
      "app.2.log",
    ])
  })

  it("returns nothing when the folder does not exist yet", async () => {
    const reader = new FileLogReader(join(dir, "missing"))

    expect(await reader.readRecent({ limit: 10 })).toEqual([])
    expect(await reader.listFiles()).toEqual([])
  })
})
