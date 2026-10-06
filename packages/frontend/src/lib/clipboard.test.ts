import { describe, it, expect, vi, afterEach } from "vitest"

import { copyTextToClipboard } from "./clipboard"

const stubClipboard = (value: unknown): void => {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  })
}

const stubExecCommand = (implementation: () => boolean): ReturnType<typeof vi.fn> => {
  const execCommand = vi.fn(implementation)
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
  })
  return execCommand
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("copyTextToClipboard", () => {
  it("usa la API de portapapeles cuando está disponible", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    const copied = await copyTextToClipboard("hola")

    expect(copied).toBe(true)
    expect(writeText).toHaveBeenCalledWith("hola")
  })

  it("cae al método clásico cuando no hay API de portapapeles (HTTP)", async () => {
    stubClipboard(undefined)
    const execCommand = stubExecCommand(() => true)

    const copied = await copyTextToClipboard("http://192.168.1.10:4322")

    expect(copied).toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
  })

  it("devuelve false si ambos caminos fallan", async () => {
    stubClipboard({
      writeText: vi.fn().mockRejectedValue(new Error("blocked")),
    })
    stubExecCommand(() => {
      throw new Error("no")
    })

    expect(await copyTextToClipboard("x")).toBe(false)
  })
})
