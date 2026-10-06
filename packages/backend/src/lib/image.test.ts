import { describe, it, expect } from "vitest"

import {
  DEFAULT_MAX_PROFILE_IMAGE_BYTES,
  detectMimeFromMagicBytes,
  formatMegabytes,
  isAllowedImageMime,
  mimeToExtension,
  validateImageBytes,
} from "@workspace/shared/lib/image"

describe("image upload limits", () => {
  it("exposes a single shared default byte limit", () => {
    expect(DEFAULT_MAX_PROFILE_IMAGE_BYTES).toBe(15 * 1024 * 1024)
  })

  it("formats the limit for display", () => {
    expect(formatMegabytes(DEFAULT_MAX_PROFILE_IMAGE_BYTES)).toBe("15 MB")
    expect(formatMegabytes(1024 * 1024)).toBe("1 MB")
  })
})

describe("isAllowedImageMime", () => {
  it("accepts allowed mime types", () => {
    expect(isAllowedImageMime("image/png")).toBe(true)
    expect(isAllowedImageMime("image/jpeg")).toBe(true)
    expect(isAllowedImageMime("image/webp")).toBe(true)
    expect(isAllowedImageMime("image/gif")).toBe(true)
  })

  it("rejects disallowed mime types", () => {
    expect(isAllowedImageMime("image/svg+xml")).toBe(false)
    expect(isAllowedImageMime("text/plain")).toBe(false)
    expect(isAllowedImageMime("application/pdf")).toBe(false)
  })
})

describe("detectMimeFromMagicBytes", () => {
  it("detects PNG", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(detectMimeFromMagicBytes(bytes)).toBe("image/png")
  })

  it("detects JPEG", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(detectMimeFromMagicBytes(bytes)).toBe("image/jpeg")
  })

  it("detects GIF89a", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    expect(detectMimeFromMagicBytes(bytes)).toBe("image/gif")
  })

  it("detects GIF87a", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    expect(detectMimeFromMagicBytes(bytes)).toBe("image/gif")
  })

  it("detects WEBP", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size placeholder
      0x57, 0x45, 0x42, 0x50, // WEBP
    ])
    expect(detectMimeFromMagicBytes(bytes)).toBe("image/webp")
  })

  it("returns null for unknown magic bytes", () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    expect(detectMimeFromMagicBytes(bytes)).toBe(null)
  })
})

describe("mimeToExtension", () => {
  it("maps allowed mimes to extensions", () => {
    expect(mimeToExtension("image/png")).toBe("png")
    expect(mimeToExtension("image/jpeg")).toBe("jpg")
    expect(mimeToExtension("image/gif")).toBe("gif")
    expect(mimeToExtension("image/webp")).toBe("webp")
  })

  it("returns null for unknown mimes", () => {
    expect(mimeToExtension("image/svg+xml")).toBe(null)
    expect(mimeToExtension("text/plain")).toBe(null)
  })
})

describe("validateImageBytes", () => {
  it("returns ok for valid image", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const result = validateImageBytes(pngBytes, "image/png", 3 * 1024 * 1024)
    expect(result.ok).toBe(true)
  })

  it("rejects empty file", () => {
    const result = validateImageBytes(new Uint8Array([]), "image/png", 3 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })

  it("rejects oversized file", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const result = validateImageBytes(bytes, "image/png", 1)
    expect(result.ok).toBe(false)
  })

  it("rejects disallowed mime", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const result = validateImageBytes(bytes, "image/svg+xml", 3 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })

  it("rejects mime mismatch", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const result = validateImageBytes(pngBytes, "image/jpeg", 3 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })
})
