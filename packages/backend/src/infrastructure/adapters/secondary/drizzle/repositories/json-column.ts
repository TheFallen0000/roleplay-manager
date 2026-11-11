export const parseJsonArray = (
  value: string | null | undefined,
): string[] => {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

export const parseJsonValue = (
  value: string | null | undefined,
): unknown => {
  if (value === null || value === undefined) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const serializeJsonValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? null : serialized
  } catch {
    return null
  }
}
