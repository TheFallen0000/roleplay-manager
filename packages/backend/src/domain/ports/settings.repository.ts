/**
 * Access port for the `settings` table.
 *
 * The table is a simple key-value store persisting global system
 * configuration (default provider, model, remote provider keys, etc.).
 * The domain consumes it through this port; the implementation (Drizzle)
 * lives in infrastructure.
 */
export interface SettingsRepository {
  get(key: string): Promise<string | null>
  getMany(keys: string[]): Promise<Record<string, string | null>>
  set(key: string, value: string): Promise<void>
  setMany(entries: Record<string, string>): Promise<void>
}
