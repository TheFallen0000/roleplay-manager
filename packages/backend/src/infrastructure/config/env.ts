import { z } from "zod"
import { DEFAULT_MAX_PROFILE_IMAGE_BYTES } from "@workspace/shared/lib/image"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_PATH: z.string().min(1).default("./data/roleplay.db"),
  DATA_DIR: z.string().min(1).default("./data"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  CORS_ORIGIN: z.string().url().default("http://localhost:4321"),
  TUNNEL_TARGET_URL: z.string().url().default("http://localhost:4321"),
  TAILSCALE_BIN: z.string().min(1).optional(),
  MAX_PROFILE_IMAGE_BYTES: z.coerce.number().int().positive().default(DEFAULT_MAX_PROFILE_IMAGE_BYTES),
  MAX_PROFILE_IMAGE_PIXELS: z.coerce.number().int().positive().default(40_000_000),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  PROVIDER_STREAMING_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  OLLAMA_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:11434"),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

export const loadEnv = (): Env => {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid environment variables:\n${formatted}`)
  }
  cached = parsed.data
  return cached
}
