import { deflateSync, inflateSync } from "node:zlib"

/**
 * Deterministic PNG builder for the S132 adapter tests. No network, no binary
 * fixtures on disk: every byte is generated in memory with `node:zlib`.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let value = n
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[n] = value >>> 0
  }
  return table
})()

export const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

interface ChunkOptions {
  corruptCrc?: boolean
  lengthDelta?: number
}

export const pngChunk = (
  type: string,
  data: Buffer,
  options: ChunkOptions = {}
): Buffer => {
  const declaredLength = Math.max(0, data.length + (options.lengthDelta ?? 0))
  const length = Buffer.alloc(4)
  length.writeUInt32BE(declaredLength)
  const typeBytes = Buffer.from(type, "latin1")
  const body = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  if (options.corruptCrc) crc[3] ^= 0xff
  return Buffer.concat([length, typeBytes, data, crc])
}

export const textChunk = (
  keyword: string,
  payload: string,
  options: ChunkOptions = {}
): Buffer =>
  pngChunk(
    "tEXt",
    Buffer.concat([
      Buffer.from(keyword, "latin1"),
      Buffer.from([0]),
      Buffer.from(payload, "utf8"),
    ]),
    options
  )

export const base64Text = (json: string): string =>
  Buffer.from(json, "utf8").toString("base64")

const createIhdr = (width: number, height: number): Buffer => {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = 8 // bit depth
  data[9] = 6 // RGBA
  data[10] = 0 // compression
  data[11] = 0 // filter
  data[12] = 0 // interlace
  return pngChunk("IHDR", data)
}

export const buildIdatPayload = (
  width = 1,
  height = 1,
  rgba: [number, number, number, number] = [137, 24, 64, 255]
): Buffer => {
  const scanline = Buffer.from([0, ...rgba])
  const rows = Buffer.concat(Array.from({ length: height }, () => scanline))
  return deflateSync(rows)
}

export interface BuildPngFixtureOptions {
  /** JSON payload written to a `chara` tEXt chunk. */
  chara?: string
  /** JSON payload written to a `ccv3` tEXt chunk. */
  ccv3?: string
  /** Extra tEXt chunks in file order (used for duplicates). */
  extraText?: Array<{ keyword: string; payload: string }>
  /** Split the compressed IDAT into this many chunks. */
  idatChunks?: number
  /** Add acTL/fcTL/fdAT chunks (APNG). They must be ignored on read. */
  apng?: boolean
  /** Add an unknown critical chunk (first letter uppercase). */
  unknownCriticalChunk?: boolean
  /** Add an unknown ancillary chunk (lowercase first letter). */
  unknownAncillaryChunk?: boolean
  /** Corrupt the CRC of the first tEXt chunk. */
  corruptCrc?: boolean
  /** Declare one byte more than the actual tEXt payload length. */
  badLength?: boolean
  omitIhdr?: boolean
  omitIend?: boolean
  signature?: Buffer
  /** Override the compressed image payload. */
  idat?: Buffer
  /** Cut the final buffer at this many bytes. */
  truncate?: number
}

export const buildCardPngFixture = (
  options: BuildPngFixtureOptions = {}
): Buffer => {
  const chunks: Buffer[] = []

  chunks.push(options.signature ?? PNG_SIGNATURE)
  if (!options.omitIhdr) chunks.push(createIhdr(1, 1))

  if (options.chara !== undefined) {
    chunks.push(textChunk("chara", base64Text(options.chara), {
      corruptCrc: options.corruptCrc,
      lengthDelta: options.badLength ? 1 : 0,
    }))
  }
  if (options.ccv3 !== undefined) {
    chunks.push(textChunk("ccv3", base64Text(options.ccv3)))
  }
  for (const extra of options.extraText ?? []) {
    chunks.push(textChunk(extra.keyword, extra.payload))
  }

  if (options.apng) {
    chunks.push(pngChunk("acTL", Buffer.alloc(8)))
    chunks.push(pngChunk("fcTL", Buffer.alloc(26)))
    chunks.push(pngChunk("fdAT", Buffer.from([0, 0, 0, 1])))
  }

  if (options.unknownAncillaryChunk) {
    chunks.push(pngChunk("tIME", Buffer.alloc(7)))
  }
  if (options.unknownCriticalChunk) {
    // Uppercase first letter: the ancillary bit is 0, so a decoder must reject it.
    chunks.push(pngChunk("XXXX", Buffer.from("critical")))
  }

  const idat = options.idat ?? buildIdatPayload()
  const idatChunks = options.idatChunks ?? 1
  if (idatChunks <= 1) {
    chunks.push(pngChunk("IDAT", idat))
  } else {
    const size = Math.ceil(idat.length / idatChunks)
    for (let index = 0; index < idatChunks; index += 1) {
      chunks.push(pngChunk("IDAT", idat.subarray(index * size, (index + 1) * size)))
    }
  }

  if (!options.omitIend) chunks.push(pngChunk("IEND", Buffer.alloc(0)))

  const png = Buffer.concat(chunks)
  return options.truncate === undefined
    ? png
    : png.subarray(0, options.truncate)
}

export interface TextChunk {
  keyword: string
  payload: string
}

/** Minimal tEXt reader used to assert what the exporter wrote. */
export const readTextChunks = (png: Buffer): TextChunk[] => {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Not a PNG")
  }
  const chunks: TextChunk[] = []
  let offset = 8
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString("latin1")
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === "tEXt") {
      const separator = data.indexOf(0)
      chunks.push({
        keyword: data.subarray(0, separator).toString("latin1"),
        payload: data.subarray(separator + 1).toString("utf8"),
      })
    }
    offset += 12 + length
  }
  return chunks
}

/** Decompresses every IDAT chunk (concatenated in file order). */
export const inflatePngIdat = (png: Buffer): Buffer => {
  const parts: Buffer[] = []
  let offset = 8
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString("latin1")
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === "IDAT") parts.push(data)
    offset += 12 + length
  }
  return inflateSync(Buffer.concat(parts))
}
