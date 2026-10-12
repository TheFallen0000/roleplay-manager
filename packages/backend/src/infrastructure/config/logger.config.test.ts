import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildLogger } from "./logger.config"

let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "rm-logger-"))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** pino transports run in a worker: poll until the entry lands on disk. */
const waitForEntry = async (needle: string): Promise<string> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const files = await readdir(dir).catch(() => [] as string[])
    for (const file of files) {
      const content = await readFile(join(dir, file), "utf8").catch(() => "")
      if (content.includes(needle)) return content
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`"${needle}" never reached the log file`)
}

describe("buildLogger", () => {
  it("writes to a rotating file and redacts credentials", async () => {
    const logger = buildLogger({
      level: "debug",
      nodeEnv: "test",
      logDir: dir,
    })

    logger.info(
      {
        req: {
          method: "GET",
          url: "/api/health",
          headers: {
            authorization: "Bearer SECRET123",
            cookie: "session=SECRET456",
          },
        },
      },
      "request completed",
    )
    logger.flush()

    const content = await waitForEntry("request completed")

    expect(content).toContain("[redacted]")
    expect(content).not.toContain("SECRET123")
    expect(content).not.toContain("SECRET456")
  })

  it("keeps working without a log folder (tests, tooling)", () => {
    const logger = buildLogger({ level: "info", nodeEnv: "test" })

    expect(() => logger.info("console only")).not.toThrow()
  })
})
