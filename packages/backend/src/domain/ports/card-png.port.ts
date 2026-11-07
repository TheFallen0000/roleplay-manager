export interface CardPngParseResult {
  cardJson: string
  imageBuffer: Uint8Array | null
}

export interface CardPngBuildInput {
  charaJson?: string
  ccv3Json?: string
  imagePng?: Uint8Array | null
}

/**
 * PNG card container port. The adapter lives in infrastructure and owns
 * `node:zlib`; application code only sees bytes and JSON.
 */
export interface CardPngPort {
  parse(buffer: Uint8Array): CardPngParseResult
  build(input: CardPngBuildInput): Uint8Array
}
