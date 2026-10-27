import { describe, expect, it } from "vitest"

import { loadEnv } from "./env"

describe("environment defaults", () => {
  it("binds the backend to loopback unless HOST is set", () => {
    const previous = process.env.HOST
    delete process.env.HOST
    try {
      expect(loadEnv().HOST).toBe("127.0.0.1")
    } finally {
      if (previous === undefined) delete process.env.HOST
      else process.env.HOST = previous
    }
  })
})
