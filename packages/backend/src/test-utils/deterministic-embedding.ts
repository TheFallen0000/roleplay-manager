import type { EmbedRequest, EmbedResult } from "@workspace/shared/types/embedding"

import type { ProviderPort } from "../domain/ports/provider.port"

/**
 * Deterministic, network-free embedding source shared by unit tests and evals.
 *
 * Synonyms share one token vector, so a text built from a synonym cluster lands
 * on the same point as its paraphrase. Unmapped tokens get a stable pseudo-random
 * vector that is almost orthogonal to every other token. The text vector is the
 * sum of its token vectors, then L2-normalized.
 */
export const DETERMINISTIC_EMBEDDING_MODEL = "deterministic-embed"
export const DETERMINISTIC_EMBEDDING_DIMENSION = 8

const SYNONYM_CLUSTERS: readonly (readonly string[])[] = [
  ["dragon", "wyrm", "draco"],
  ["fuego", "llamas", "llama", "flama"],
  ["escupe", "exhala", "vomita"],
  ["bosque", "arboleda", "selva"],
  ["rey", "monarca", "soberano"],
  ["promesa", "juramento", "voto"],
  ["amanecer", "alba", "aurora"],
  ["herida", "cicatriz", "lesion"],
]

const clusterByToken = new Map<string, number>()
SYNONYM_CLUSTERS.forEach((cluster, index) => {
  for (const token of cluster) clusterByToken.set(token, index)
})

export const normalizeEmbeddingText = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")

export const tokenizeEmbeddingText = (text: string): string[] =>
  normalizeEmbeddingText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)

const hashSeed = (value: string): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const pseudoRandomVector = (seed: number): number[] => {
  let state = seed || 1
  return Array.from(
    { length: DETERMINISTIC_EMBEDDING_DIMENSION },
    () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return (state / 0xffffffff) * 2 - 1
    },
  )
}

const tokenVector = (token: string): number[] => {
  const cluster = clusterByToken.get(token)
  if (cluster !== undefined) {
    // Cluster constants keep every synonym of a concept on the exact same
    // point, so paraphrases built from synonyms are identical vectors.
    return pseudoRandomVector(10_000 + cluster * 7919)
  }
  return pseudoRandomVector(hashSeed(token))
}

const l2Normalize = (vector: readonly number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (norm === 0) return vector.map(() => 0)
  return vector.map((value) => value / norm)
}

/** The normalized vector the fake would return for one text. */
export const embeddingVectorForText = (text: string): number[] => {
  const sum = new Array<number>(DETERMINISTIC_EMBEDDING_DIMENSION).fill(0)
  for (const token of tokenizeEmbeddingText(text)) {
    const vector = tokenVector(token)
    for (let index = 0; index < sum.length; index += 1) {
      sum[index] += vector[index] ?? 0
    }
  }
  return l2Normalize(sum)
}

export const fakeEmbed = (input: EmbedRequest): EmbedResult => ({
  vectors: input.texts.map((text) => embeddingVectorForText(text)),
  model: input.model,
  dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
})

export const cosineSimilarity = (
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number => {
  const length = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    dot += a * b
    leftNorm += a * a
    rightNorm += b * b
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}

export interface DeterministicEmbeddingOptions {
  /** Make `embed` reject, simulating a provider failure. */
  fail?: boolean
  /** Build an adapter without the optional embedding method. */
  missingEmbed?: boolean
  model?: string
}

export const createDeterministicEmbeddingProvider = (
  options: DeterministicEmbeddingOptions = {},
): ProviderPort => {
  const model = options.model ?? DETERMINISTIC_EMBEDDING_MODEL
  const base: ProviderPort = {
    validateConnection: async () => "available",
    listModels: async () => ({
      models: [{ id: model, name: model }],
      manualEntryRequired: false,
    }),
    async *generateStreaming() {},
  }

  if (options.missingEmbed) return base

  return {
    ...base,
    embed: async (input) => {
      if (options.fail) {
        throw new Error("Deterministic embedding provider failed")
      }
      return fakeEmbed(input)
    },
  }
}
