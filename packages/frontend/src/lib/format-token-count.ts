/**
 * Compact token counts for tight UI (badges, metadata rows): `950`, `1.2k`,
 * `128k`, `1M`. It is intentionally not locale-aware for the unit suffix;
 * the number itself follows the requested locale.
 */
export const formatTokenCount = (value: number, locale = "en"): string => {
  const safe = Math.max(0, Math.round(value))
  if (safe < 1000) return String(safe)

  const units = ["k", "M"]
  let scaled = safe
  let unitIndex = -1
  do {
    scaled /= 1000
    unitIndex += 1
  } while (scaled >= 999.5 && unitIndex < units.length - 1)

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: scaled >= 100 ? 0 : 1,
  }).format(scaled)
  return `${formatted}${units[unitIndex]}`
}
