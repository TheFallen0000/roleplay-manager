import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const SOURCE =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
const OUT = fileURLToPath(
  new URL(
    "../src/infrastructure/adapters/secondary/model-catalog/curated-model-catalog.ts",
    import.meta.url,
  ),
)

const PROVIDER_PREFIXES = [
  "azure_ai",
  "azure",
  "openrouter",
  "bedrock",
  "vertex_ai",
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "mistral",
  "together_ai",
  "fireworks_ai",
  "deepseek",
  "xai",
  "ollama_chat",
  "ollama",
  "cloudflare",
  "cerebras",
  "novita",
  "llamagate",
  "inferenceapis",
]

const REGION_PREFIXES = new Set([
  "eu",
  "us",
  "global",
  "global-standard",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
])

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`)
const data = await response.json()

const isChatMode = (mode) =>
  mode === undefined || mode === "chat" || mode === "completion" || mode === "responses"

const toNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null

const variants = (key) => {
  const found = new Set([key])
  let current = key
  for (;;) {
    const slash = current.indexOf("/")
    if (slash === -1) break
    const prefix = current.slice(0, slash)
    if (!PROVIDER_PREFIXES.includes(prefix) && !REGION_PREFIXES.has(prefix)) break
    current = current.slice(slash + 1)
    found.add(current)
  }
  const last = key.slice(key.lastIndexOf("/") + 1)
  if (last.length > 2) found.add(last)
  return [...found]
}

const candidates = []
for (const [rawKey, value] of Object.entries(data)) {
  if (!isChatMode(value.mode)) continue
  const contextWindow = toNumber(value.max_input_tokens)
  const maxOutputTokens = toNumber(value.max_output_tokens) ?? toNumber(value.max_tokens)
  if (contextWindow === null && maxOutputTokens === null) continue
  const key = rawKey.trim().toLowerCase()
  if (key.length === 0 || key.includes(" ")) continue
  for (const model of variants(key)) {
    candidates.push({
      model,
      contextWindow,
      maxOutputTokens,
      slashes: model.split("/").length - 1,
      both: contextWindow !== null && maxOutputTokens !== null ? 0 : 1,
      rawKey: key,
    })
  }
}

candidates.sort(
  (a, b) =>
    a.model.localeCompare(b.model) ||
    a.slashes - b.slashes ||
    a.both - b.both ||
    a.rawKey.localeCompare(b.rawKey)
)

const seen = new Set()
const entries = []
for (const candidate of candidates) {
  if (seen.has(candidate.model)) continue
  seen.add(candidate.model)
  entries.push(candidate)
}

const lines = entries.map(({ model, contextWindow, maxOutputTokens }) => {
  const fields = [`model: ${JSON.stringify(model)}`]
  if (contextWindow !== null) fields.push(`contextWindow: ${contextWindow}`)
  if (maxOutputTokens !== null) fields.push(`maxOutputTokens: ${maxOutputTokens}`)
  return `  { ${fields.join(", ")} },`
})

const output = `/**
 * Generated from LiteLLM's model_prices_and_context_window.json.
 * Source: https://github.com/BerriAI/litellm (MIT outside enterprise/).
 * Refresh: pnpm --filter @workspace/backend catalog:refresh
 * Do not edit by hand.
 */
import type { CuratedModelEntry } from "@workspace/shared/types/model-capabilities"

export const CURATED_MODEL_CATALOG: CuratedModelEntry[] = [
${lines.join("\n")}
]
`

writeFileSync(OUT, output)
console.log(`entries=${entries.length} bytes=${Buffer.byteLength(output)}`)
