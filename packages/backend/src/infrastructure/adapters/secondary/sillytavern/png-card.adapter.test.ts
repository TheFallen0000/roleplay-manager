import { describe, expect, it, vi, afterEach } from "vitest"

import {
  buildCardPng,
  MAX_CARD_JSON_BYTES,
  MAX_CARD_PNG_BYTES,
  MAX_DECODED_CARD_JSON_BYTES,
  MAX_IDAT_DECOMPRESSED_BYTES,
  MAX_PNG_CHUNKS,
  MAX_TEXT_CHUNK_BYTES,
  parseCardPng,
} from "./png-card.adapter"
import {
  buildCardPngFixture,
  buildIdatPayload,
  readTextChunks,
} from "../../../../test-utils/png-fixtures"

const charaJson = JSON.stringify({
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: { name: "Chara", first_mes: "Hello" },
})
const ccv3Json = JSON.stringify({
  spec: "chara_card_v3",
  spec_version: "3.0",
  data: { name: "Ccv3", first_mes: "Hello" },
})

const capture = (callback: () => unknown): { code?: string } | null => {
  try {
    callback()
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("PNG card adapter — round-trip", () => {
  it("parses a chara chunk as UTF-8 JSON", () => {
    const png = buildCardPngFixture({ chara: charaJson })
    const parsed = parseCardPng(png)

    expect(JSON.parse(parsed.cardJson)).toMatchObject({
      spec: "chara_card_v2",
      data: { name: "Chara" },
    })
    expect(parsed.imageBuffer).not.toBeNull()
  })

  it("builds a valid PNG with chara and ccv3 chunks", () => {
    const png = buildCardPng({
      charaJson,
      ccv3Json,
      imagePng: null,
    })

    const chunks = readTextChunks(png)
    expect(chunks.map((chunk) => chunk.keyword)).toEqual(
      expect.arrayContaining(["chara", "ccv3"])
    )
    expect(JSON.parse(chunks.find((chunk) => chunk.keyword === "chara")!.payload))
      .toMatchObject({ spec: "chara_card_v2" })
    expect(JSON.parse(chunks.find((chunk) => chunk.keyword === "ccv3")!.payload))
      .toMatchObject({ spec: "chara_card_v3" })
  })

  it("prefers ccv3 when both chunks are present", () => {
    const png = buildCardPngFixture({ chara: charaJson, ccv3: ccv3Json })
    const parsed = parseCardPng(png)

    expect(JSON.parse(parsed.cardJson).data.name).toBe("Ccv3")
  })

  it("uses the last duplicate tEXt chunk without error", () => {
    const first = JSON.stringify({ spec: "chara_card_v2", data: { name: "First" } })
    const second = JSON.stringify({ spec: "chara_card_v2", data: { name: "Second" } })
    const png = buildCardPngFixture({
      extraText: [
        { keyword: "chara", payload: Buffer.from(first).toString("base64") },
        { keyword: "chara", payload: Buffer.from(second).toString("base64") },
      ],
    })

    expect(JSON.parse(parseCardPng(png).cardJson).data.name).toBe("Second")
  })

  it("concatenates multiple IDAT chunks before inflating", () => {
    const single = parseCardPng(
      buildCardPngFixture({ chara: charaJson, idatChunks: 1 })
    ).imageBuffer
    const multiple = parseCardPng(
      buildCardPngFixture({ chara: charaJson, idatChunks: 2 })
    ).imageBuffer

    expect(multiple).not.toBeNull()
    expect(multiple?.equals(single as Buffer)).toBe(true)
  })

  it("ignores APNG control chunks and reads the base frame", () => {
    const plain = parseCardPng(
      buildCardPngFixture({ chara: charaJson })
    ).imageBuffer
    const apng = parseCardPng(
      buildCardPngFixture({ chara: charaJson, apng: true })
    ).imageBuffer

    expect(apng).not.toBeNull()
    expect(apng?.equals(plain as Buffer)).toBe(true)
  })
})

describe("PNG card adapter — malformed input", () => {
  const cases: Array<[string, () => Buffer]> = [
    [
      "signature",
      () =>
        buildCardPngFixture({
          chara: charaJson,
          signature: Buffer.from("not a png!"),
        }),
    ],
    [
      "unknown critical chunk",
      () => buildCardPngFixture({ chara: charaJson, unknownCriticalChunk: true }),
    ],
    ["bad CRC", () => buildCardPngFixture({ chara: charaJson, corruptCrc: true })],
    ["bad length", () => buildCardPngFixture({ chara: charaJson, badLength: true })],
    ["missing IHDR", () => buildCardPngFixture({ chara: charaJson, omitIhdr: true })],
    ["missing IEND", () => buildCardPngFixture({ chara: charaJson, omitIend: true })],
    ["truncated", () => buildCardPngFixture({ chara: charaJson, truncate: 20 })],
  ]

  it.each(cases)("rejects %s with INVALID_CARD_PNG", (_name, build) => {
    expect(capture(() => parseCardPng(build()))?.code).toBe("INVALID_CARD_PNG")
  })

  it("rejects an invalid base64 tEXt payload with INVALID_CARD_PNG", () => {
    const png = buildCardPngFixture({
      extraText: [{ keyword: "chara", payload: "not base64!!!" }],
    })

    expect(capture(() => parseCardPng(png))?.code).toBe("INVALID_CARD_PNG")
  })

  it("rejects a payload with a non-canonical base64 padding", () => {
    const png = buildCardPngFixture({
      extraText: [{ keyword: "ccv3", payload: "eyJhIjoxfQ===" }],
    })

    expect(capture(() => parseCardPng(png))?.code).toBe("INVALID_CARD_PNG")
  })

  it("rejects plain JSON in a tEXt chunk (strict base64)", () => {
    const png = buildCardPngFixture({
      extraText: [{ keyword: "ccv3", payload: '{"spec":"chara_card_v3"}' }],
    })

    expect(capture(() => parseCardPng(png))?.code).toBe("INVALID_CARD_PNG")
  })
})

describe("PNG card adapter — injectable limits", () => {
  it("rejects a file over MAX_CARD_PNG_BYTES", () => {
    const png = buildCardPngFixture({ chara: charaJson })
    expect(
      capture(() => parseCardPng(png, { maxCardPngBytes: png.length - 1 }))?.code
    ).toBe("INVALID_CARD_PNG")
  })

  it("rejects a tEXt chunk over MAX_TEXT_CHUNK_BYTES", () => {
    const png = buildCardPngFixture({ chara: charaJson })
    expect(
      capture(() => parseCardPng(png, { maxTextChunkBytes: 8 }))?.code
    ).toBe("INVALID_CARD_PNG")
  })

  it("rejects decoded JSON over MAX_DECODED_CARD_JSON_BYTES", () => {
    const png = buildCardPngFixture({ chara: charaJson })
    expect(
      capture(() =>
        parseCardPng(png, { maxDecodedCardJsonBytes: charaJson.length - 1 })
      )?.code
    ).toBe("INVALID_CARD_PNG")
  })

  it("rejects an IDAT decompression bomb", () => {
    const png = buildCardPngFixture({
      chara: charaJson,
      idat: buildIdatPayload(100, 100),
    })
    expect(
      capture(() => parseCardPng(png, { maxIdatDecompressedBytes: 32 }))?.code
    ).toBe("INVALID_CARD_PNG")
  })

  it("rejects files over MAX_PNG_CHUNKS", () => {
    const png = buildCardPngFixture({
      chara: charaJson,
      extraText: Array.from({ length: 10 }, () => ({
        keyword: "Comment",
        payload: "ignored",
      })),
    })
    expect(
      capture(() => parseCardPng(png, { maxPngChunks: 3 }))?.code
    ).toBe("INVALID_CARD_PNG")
  })

  it("exports the RFC defaults", () => {
    expect(MAX_CARD_JSON_BYTES).toBe(5 * 1024 * 1024)
    expect(MAX_CARD_PNG_BYTES).toBe(10 * 1024 * 1024)
    expect(MAX_PNG_CHUNKS).toBe(512)
    expect(MAX_TEXT_CHUNK_BYTES).toBe(8 * 1024 * 1024)
    expect(MAX_DECODED_CARD_JSON_BYTES).toBe(5 * 1024 * 1024)
    expect(MAX_IDAT_DECOMPRESSED_BYTES).toBe(50 * 1024 * 1024)
    expect(MAX_TEXT_CHUNK_BYTES).toBeGreaterThanOrEqual(
      Math.ceil((MAX_DECODED_CARD_JSON_BYTES * 4) / 3)
    )
  })
})

describe("PNG card adapter — placeholder and no network", () => {
  it("writes a 1x1 RGBA placeholder without fetching anything", () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const png = buildCardPng({
      charaJson,
      ccv3Json,
      imagePng: null,
    })

    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
    expect(parseCardPng(png).imageBuffer).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("never fetches while parsing", () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    parseCardPng(buildCardPngFixture({ chara: charaJson, ccv3: ccv3Json }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
