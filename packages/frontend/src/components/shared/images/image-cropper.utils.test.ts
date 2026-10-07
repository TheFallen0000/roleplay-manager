import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { blobToFile, fileToDataUrl, getCroppedImg, type CropArea } from "./image-cropper.utils"

class MockImage {
  private listeners: Record<string, Array<() => void>> = {}
  naturalWidth = 100
  naturalHeight = 100
  addEventListener(type: string, cb: () => void) {
    ;(this.listeners[type] ??= []).push(cb)
  }
  set src(_value: string) {
    queueMicrotask(() => (this.listeners["load"] ?? []).forEach((cb) => cb()))
  }
}

const crop: CropArea = { x: 0, y: 0, width: 50, height: 50 }

beforeEach(() => {
  window.Image = MockImage as unknown as typeof Image
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
    cb(new Blob(["cropped"], { type: "image/png" }))
  }) as never
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("getCroppedImg", () => {
  it("returns a PNG blob for the cropped area", async () => {
    const blob = await getCroppedImg("data:image/png;base64,AAAA", crop)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("image/png")
  })

  it("creates a canvas sized to the crop area", async () => {
    await getCroppedImg("data:image/png;base64,AAAA", crop)
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d")
  })
})

describe("fileToDataUrl", () => {
  it("resolves to the file's data URL", async () => {
    const file = new File(["abc"], "avatar.png", { type: "image/png" })
    const url = await fileToDataUrl(file)
    expect(url).toContain("data:image/png")
  })
})

describe("blobToFile", () => {
  it("wraps a blob into a File with the given name and mime", () => {
    const blob = new Blob(["x"], { type: "image/png" })
    const file = blobToFile(blob, "cropped.png", "image/png")
    expect(file.name).toBe("cropped.png")
    expect(file.type).toBe("image/png")
  })
})
