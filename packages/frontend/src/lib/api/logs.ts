import type { LogEntryDTO, LogLevelName } from "@workspace/shared/types/log"

import { apiRequest, getBaseUrl } from "./client"

export interface RecentLogsQuery {
  limit?: number
  /** Minimum level to include. */
  level?: LogLevelName
}

export const getRecentLogs = (
  query: RecentLogsQuery = {},
): Promise<{ entries: LogEntryDTO[] }> => {
  const search = new URLSearchParams()
  if (query.limit) search.set("limit", String(query.limit))
  if (query.level) search.set("level", query.level)
  const suffix = search.toString()
  return apiRequest<{ entries: LogEntryDTO[] }>(
    `/api/logs${suffix ? `?${suffix}` : ""}`,
  )
}

export const getLogsDownloadUrl = (): string =>
  `${getBaseUrl()}/api/logs/download`
