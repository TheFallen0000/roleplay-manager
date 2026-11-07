import { crc32, deflateSync, inflateSync } from "node:zlib"

import { DomainError } from "../../../../domain/errors"
import type { CardPngPort } from "../../../../domain/ports/card-png.port"

/**
 * Minimal, dependency-free PNG reader/writer for SillyTavern cards. It only
 * understands the structural chunks needed to read `tEXt` cards and to write a
 * valid static PNG; pixel data is never re-encoded here.
 */

export const MAX_CARD_JSON_BYTES = 5 * 1024 * 1024
export const MAX_CARD_PNG_BYTES = 10 * 1024 * 1024
export const MAX_PNG_CHUNKS = 512
export const MAX_TEXT_CHUNK_BYTES = 8 * 1024 * 1024
export const MAX_DECODED_CARD_JSON_BYTES = 5 * 1024 * 1024
export const MAX_IDAT_DECOMPRESSED_BYTES = 50 * 1024 * 1024

export interface PngCardLimits {
  maxCardPngBytes: number
  maxTextChunkBytes: number
  maxDecodedCardJsonBytes: number
  maxIdatDecompressedBytes: number
  maxPngChunks: number
}

const DEFAULT_LIMITS: PngCardLimits = {
  maxCardPngBytes: MAX_CARD_PNG_BYTES,
  maxTextChunkBytes: MAX_TEXT_CHUNK_BYTES,
  maxDecodedCardJsonBytes: MAX_DECODED_CARD_JSON_BYTES,
  maxIdatDecompressedBytes: MAX_IDAT_DECOMPRESSED_BYTES,
  maxPngChunks: MAX_PNG_CHUNKS,
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const CARD_KEYWORDS = new Set(["chara", "ccv3"])
// Critical chunks from the PNG core spec that may appear in a valid file.
const KNOWN_CRITICAL_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"])
const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

interface RawChunk {
  type: string
  data: Buffer
}

interface ReadChunksOptions {
  checkCrc: boolean
  maxChunks: number
}

const invalidPng = (message: string): never => {
  throw new DomainError("INVALID_CARD_PNG", message, 400)
}

const isAncillary = (type: string): boolean =>
  (Buffer.from(type, "latin1")[0] & 0x20) !== 0

const readChunks = (
  buffer: Buffer,
  options: ReadChunksOptions,
): RawChunk[] => {
  if (buffer.length < PNG_SIGNATURE.length) {
    invalidPng("The file is not a PNG image.")
  }
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    invalidPng("The PNG signature is invalid.")
  }

  const chunks: RawChunk[] = []
  let offset = PNG_SIGNATURE.length
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const typeBytes = buffer.subarray(offset + 4, offset + 8)
    const type = typeBytes.toString("latin1")
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    const crcStart = dataEnd
    if (dataEnd + 4 > buffer.length) {
      invalidPng("The PNG chunk length is out of bounds.")
    }

    const data = buffer.subarray(dataStart, dataEnd)
    if (options.checkCrc) {
      const declared = buffer.readUInt32BE(crcStart)
      const computed = crc32(Buffer.concat([typeBytes, data])) >>> 0
      if (declared !== computed) {
        invalidPng(`The PNG chunk '${type}' has an invalid CRC.`)
      }
    }

    chunks.push({ type, data })
    if (chunks.length > options.maxChunks) {
      invalidPng("The PNG contains too many chunks.")
    }

    offset = crcStart + 4
    if (type === "IEND") {
      return chunks
    }
  }

  return invalidPng("The PNG is truncated or has no IEND chunk.")
}

const pngChunk = (type: string, data: Buffer): Buffer => {
  const typeBytes = Buffer.from(type, "latin1")
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])) >>> 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

const decodeCardText = (
  payload: string,
  limits: PngCardLimits,
): string => {
  if (payload.length % 4 === 0 && STRICT_BASE64.test(payload)) {
    const decoded = Buffer.from(payload, "base64")
    if (decoded.length > limits.maxDecodedCardJsonBytes) {
      invalidPng("The decoded card JSON exceeds the size limit.")
    }
    return decoded.toString("utf8")
  }

  // Plain JSON is accepted as a compatibility superset for hand-authored
  // fixtures; SillyTavern writes base64 of the UTF-8 JSON.
  if (Buffer.byteLength(payload, "utf8") > limits.maxDecodedCardJsonBytes) {
    invalidPng("The decoded card JSON exceeds the size limit.")
  }
  try {
    JSON.parse(payload)
  } catch {
    invalidPng("The card tEXt payload is not valid base64 or JSON.")
  }
  return payload
}

const textChunkPayload = (data: Buffer): { keyword: string; payload: string } => {
  const separator = data.indexOf(0)
  if (separator <= 0 || separator > 79) {
    invalidPng("The PNG tEXt keyword is invalid.")
  }
  return {
    keyword: data.subarray(0, separator).toString("latin1"),
    payload: data.subarray(separator + 1).toString("utf8"),
  }
}

const rebuildBasePng = (
  signature: Buffer,
  ihdr: Buffer,
  palette: Buffer | null,
  idat: Buffer,
): Buffer => {
  const parts = [signature, pngChunk("IHDR", ihdr)]
  if (palette) parts.push(pngChunk("PLTE", palette))
  parts.push(pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0)))
  return Buffer.concat(parts)
}

export function parseCardPng(
  buffer: Buffer,
  limits: Partial<PngCardLimits> = {},
): { cardJson: string; imageBuffer: Buffer | null } {
  const resolved: PngCardLimits = { ...DEFAULT_LIMITS, ...limits }

  if (buffer.length > resolved.maxCardPngBytes) {
    invalidPng("The PNG file exceeds the size limit.")
  }

  const chunks = readChunks(buffer, {
    checkCrc: true,
    maxChunks: resolved.maxPngChunks,
  })

  let ihdr: Buffer | null = null
  let palette: Buffer | null = null
  let sawIend = false
  const idatParts: Buffer[] = []
  let chara: string | undefined
  let ccv3: string | undefined

  for (const chunk of chunks) {
    if (chunk.type === "IEND") {
      sawIend = true
      continue
    }

    if (!KNOWN_CRITICAL_CHUNKS.has(chunk.type) && !isAncillary(chunk.type)) {
      invalidPng(`The PNG contains an unknown critical chunk '${chunk.type}'.`)
    }

    switch (chunk.type) {
      case "IHDR":
        ihdr = chunk.data
        break
      case "PLTE":
        palette = chunk.data
        break
      case "IDAT":
        idatParts.push(chunk.data)
        break
      case "tEXt": {
        if (chunk.data.length > resolved.maxTextChunkBytes) {
          invalidPng("The PNG tEXt chunk exceeds the size limit.")
        }
        const { keyword, payload } = textChunkPayload(chunk.data)
        if (!CARD_KEYWORDS.has(keyword)) break
        const cardJson = decodeCardText(payload, resolved)
        if (keyword === "ccv3") ccv3 = cardJson
        else chara = cardJson
        break
      }
      default:
        break
    }
  }

  if (!ihdr) return invalidPng("The PNG has no IHDR chunk.")
  if (!sawIend) return invalidPng("The PNG has no IEND chunk.")

  const cardJson = ccv3 ?? chara
  if (cardJson === undefined) {
    return invalidPng("The PNG does not contain a chara or ccv3 chunk.")
  }

  let imageBuffer: Buffer | null = null
  if (idatParts.length > 0) {
    const compressed = Buffer.concat(idatParts)
    try {
      inflateSync(compressed, {
        maxOutputLength: resolved.maxIdatDecompressedBytes,
      })
    } catch {
      invalidPng("The PNG image data could not be decompressed.")
    }
    imageBuffer = rebuildBasePng(
      PNG_SIGNATURE,
      ihdr,
      palette,
      compressed,
    )
  }

  return { cardJson, imageBuffer }
}

const placeholderIdat = (): Buffer =>
  deflateSync(
    // One scanline: filter byte 0 followed by an opaque RGBA pixel.
    Buffer.from([0, 137, 24, 64, 255]),
  )

interface BaseImage {
  ihdr: Buffer
  palette: Buffer | null
  transparency: Buffer | null
  idat: Buffer
}

const extractBaseImage = (imagePng: Buffer): BaseImage | null => {
  let chunks: RawChunk[]
  try {
    chunks = readChunks(imagePng, {
      checkCrc: false,
      maxChunks: MAX_PNG_CHUNKS,
    })
  } catch {
    return null
  }

  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")
  const palette = chunks.find((chunk) => chunk.type === "PLTE")
  const transparency = chunks.find((chunk) => chunk.type === "tRNS")
  const idatParts = chunks
    .filter((chunk) => chunk.type === "IDAT")
    .map((chunk) => chunk.data)
  if (!ihdr || idatParts.length === 0) return null

  return {
    ihdr: ihdr.data,
    palette: palette?.data ?? null,
    transparency: transparency?.data ?? null,
    idat: Buffer.concat(idatParts),
  }
}

export function buildCardPng(
  input: { charaJson?: string; ccv3Json?: string; imagePng?: Buffer | null },
  limits: Partial<PngCardLimits> = {},
): Buffer {
  const resolved: PngCardLimits = { ...DEFAULT_LIMITS, ...limits }
  const parts: Buffer[] = [PNG_SIGNATURE]

  const baseImage = input.imagePng
    ? extractBaseImage(input.imagePng)
    : null
  const ihdr =
    baseImage?.ihdr ??
    Buffer.from([
      0, 0, 0, 1, // width
      0, 0, 0, 1, // height
      8, // bit depth
      6, // RGBA
      0, // compression
      0, // filter
      0, // interlace
    ])
  const idat = baseImage?.idat ?? placeholderIdat()

  parts.push(pngChunk("IHDR", ihdr))
  if (baseImage?.palette) parts.push(pngChunk("PLTE", baseImage.palette))
  if (baseImage?.transparency) {
    parts.push(pngChunk("tRNS", baseImage.transparency))
  }

  for (const [keyword, json] of [
    ["chara", input.charaJson],
    ["ccv3", input.ccv3Json],
  ] as const) {
    if (json === undefined) continue
    const payload = Buffer.from(json, "utf8").toString("base64")
    const data = Buffer.concat([
      Buffer.from(keyword, "latin1"),
      Buffer.from([0]),
      Buffer.from(payload, "latin1"),
    ])
    if (data.length > resolved.maxTextChunkBytes) {
      invalidPng(`The '${keyword}' chunk exceeds the size limit.`)
    }
    parts.push(pngChunk("tEXt", data))
  }

  parts.push(pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0)))

  const png = Buffer.concat(parts)
  if (png.length > resolved.maxCardPngBytes) {
    invalidPng("The generated PNG exceeds the size limit.")
  }
  return png
}

export const pngCardAdapter: CardPngPort = {
  parse(buffer) {
    return parseCardPng(Buffer.from(buffer))
  },
  build(input) {
    return buildCardPng({
      charaJson: input.charaJson,
      ccv3Json: input.ccv3Json,
      imagePng: input.imagePng ? Buffer.from(input.imagePng) : null,
    })
  },
}
