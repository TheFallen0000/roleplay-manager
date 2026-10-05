import { buildContainer } from "../containers/app-container"
import { PinoLoggerAdapter } from "../infrastructure/adapters/secondary/logger/pino-logger.adapter"
import { buildDatabase, runMigrations } from "../infrastructure/config/database"
import { loadEnv } from "../infrastructure/config/env"
import { buildLogger } from "../infrastructure/config/logger.config"

async function main(): Promise<void> {
  const env = loadEnv()
  const pino = buildLogger({ level: env.LOG_LEVEL, nodeEnv: env.NODE_ENV })
  const logger = new PinoLoggerAdapter(pino)
  const database = buildDatabase(env.DATABASE_PATH)
  const dryRun = process.argv.includes("--dry-run")

  try {
    runMigrations(database)
    const container = buildContainer({
      logger,
      pino,
      database,
      dataDir: env.DATA_DIR,
      maxProfileImageBytes: env.MAX_PROFILE_IMAGE_BYTES,
      maxProfileImagePixels: env.MAX_PROFILE_IMAGE_PIXELS,
      ollamaBaseUrl: env.OLLAMA_BASE_URL,
      providerTimeoutMs: env.PROVIDER_TIMEOUT_MS,
      providerStreamingTimeoutMs: env.PROVIDER_STREAMING_TIMEOUT_MS,
    })
    const result = await container.backfillCharacterAssetVariants.execute({
      dryRun,
    })
    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "write",
          ...result,
        },
        null,
        2,
      ),
    )
    if (result.failures.length > 0) process.exitCode = 1
  } finally {
    ;(database as unknown as { $client: { close(): void } }).$client.close()
    await new Promise<void>((resolve) => pino.flush(() => resolve()))
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
