import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm, access } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { FilesystemCharacterAssetStorage } from "./filesystem-character-asset-storage"

describe("FilesystemCharacterAssetStorage", () => {
  let tempDir: string
  let storage: FilesystemCharacterAssetStorage

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asset-test-"))
    storage = new FilesystemCharacterAssetStorage(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it("writes and reads a file", async () => {
    const data = Buffer.from("test image content")
    await storage.write("char-1", "asset-1", "png", data)

    const stream = await storage.read("char-1", "asset-1", "png")
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks).toString()).toBe("test image content")
  })

  it("stores WebP variants beside the original and reads them", async () => {
    const data = Buffer.from("webp variant")
    await storage.writeVariant("char-1", "asset-1", "thumbnail", data)

    const stream = await storage.readVariant("char-1", "asset-1", "thumbnail")
    expect(stream).not.toBeNull()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks)).toEqual(data)
    expect(await storage.hasVariant("char-1", "asset-1", "thumbnail")).toBe(true)
  })

  it("returns null for a variant that has not been generated", async () => {
    await expect(
      storage.readVariant("char-1", "asset-1", "medium"),
    ).resolves.toBeNull()
  })

  it("reports the size of an existing variant", async () => {
    await expect(
      storage.variantSize("char-1", "asset-1", "thumbnail"),
    ).resolves.toBeNull()

    await storage.writeVariant(
      "char-1",
      "asset-1",
      "thumbnail",
      Buffer.from("webp variant"),
    )

    await expect(
      storage.variantSize("char-1", "asset-1", "thumbnail"),
    ).resolves.toBe(Buffer.from("webp variant").length)
  })

  it("deletes all variants with the original asset", async () => {
    await storage.write("char-1", "asset-1", "png", Buffer.from("original"))
    await storage.writeVariant("char-1", "asset-1", "thumbnail", Buffer.from("webp"))
    await storage.delete("char-1", "asset-1", "png")

    expect(await storage.hasVariant("char-1", "asset-1", "thumbnail")).toBe(false)
  })

  it("deletes a file", async () => {
    const data = Buffer.from("to be deleted")
    await storage.write("char-1", "asset-1", "png", data)
    await storage.delete("char-1", "asset-1", "png")

    await expect(
      access(join(tempDir, "char-1", "asset-1.png")),
    ).rejects.toThrow()
  })

  it("delete is idempotent for missing files", async () => {
    await expect(
      storage.delete("char-1", "nonexistent", "png"),
    ).resolves.toBeUndefined()
  })

  it("rejects path traversal in characterId", () => {
    expect(() => storage.resolvePath("../etc/passwd", "asset-1", "png")).toThrow("Invalid path")
  })

  it("rejects path traversal in assetId", () => {
    expect(() => storage.resolvePath("char-1", "../../etc/passwd", "png")).toThrow("Invalid path")
  })

  it("rejects path traversal in extension", () => {
    expect(() => storage.resolvePath("char-1", "asset-1", "../etc/passwd")).toThrow("Invalid path")
  })

  it("rejects backslash in paths", () => {
    expect(() => storage.resolvePath("char-1", "asset-1", "png\\..\\..")).toThrow("Invalid path")
  })

  it("resolves correct file path", () => {
    const path = storage.resolvePath("char-1", "asset-1", "png")
    expect(path).toBe(join(tempDir, "char-1", "asset-1.png"))
  })
})
