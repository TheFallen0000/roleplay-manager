import { describe, expect, it } from "vitest"
import sharp from "sharp"

import { CHARACTER_ASSET_VARIANTS_BY_USAGE } from "@workspace/shared/types/image"

import { SharpCharacterAssetImageProcessor } from "./sharp-character-asset-image-processor"

async function createPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 70, g: 120, b: 180, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
}

describe("SharpCharacterAssetImageProcessor", () => {
  it("generates WebP variants without upscaling and preserves aspect ratio", async () => {
    const original = await createPng(1200, 600)
    const processor = new SharpCharacterAssetImageProcessor()
    const result = await processor.process(original, "image/png")

    expect(result.width).toBe(1200)
    expect(result.height).toBe(600)
    expect(result.variants.find((item) => item.variant === "medium")?.data.length)
      .toBeLessThan(original.length)
    expect(result.variants.map((item) => item.variant)).toEqual([
      "thumbnail",
      "small",
      "medium",
    ])

    for (const variant of result.variants) {
      const metadata = await sharp(variant.data).metadata()
      expect(metadata.format).toBe("webp")
      expect(variant.width).toBeLessThanOrEqual(1200)
      expect(variant.height).toBeLessThanOrEqual(600)
      expect(variant.width / variant.height).toBeCloseTo(2)
    }
  })

  it("generates the background variant set (no thumbnail) when requested", async () => {
    const original = await createPng(2400, 1350)
    const result = await new SharpCharacterAssetImageProcessor().process(
      original,
      "image/png",
      { variants: CHARACTER_ASSET_VARIANTS_BY_USAGE.background },
    )

    expect(result.variants.map((item) => item.variant)).toEqual([
      "small",
      "medium",
      "large",
    ])
    expect(
      result.variants.find((item) => item.variant === "large")?.width,
    ).toBe(1920)
  })

  it("creates only one variant when the source is smaller than all targets", async () => {
    const original = await createPng(96, 96)
    const result = await new SharpCharacterAssetImageProcessor().process(
      original,
      "image/png",
    )

    expect(result.variants).toHaveLength(1)
    expect(result.variants[0].variant).toBe("thumbnail")
    expect(result.variants[0].width).toBe(96)
  })

  it("keeps GIFs as originals and does not generate variants", async () => {
    const gif = Buffer.from(
      "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
      "base64",
    )
    const result = await new SharpCharacterAssetImageProcessor().process(
      gif,
      "image/gif",
    )

    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(result.variants).toEqual([])
  })

  it("rejects files exceeding the configured pixel limit", async () => {
    const original = await createPng(20, 20)
    const processor = new SharpCharacterAssetImageProcessor(100)

    await expect(processor.process(original, "image/png")).rejects.toThrow(
      /pixel|limit/i,
    )
  })

  it("rejects MIME types that do not match the decoded image", async () => {
    const original = await createPng(8, 8)

    await expect(
      new SharpCharacterAssetImageProcessor().process(original, "image/jpeg"),
    ).rejects.toThrow(/does not match mime/i)
  })
})
