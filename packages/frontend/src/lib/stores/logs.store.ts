import { create } from "zustand"

import type { LogEntryDTO, LogLevelName } from "@workspace/shared/types/log"

import * as logsApi from "@/lib/api/logs"

const ENTRY_LIMIT = 300

export interface LogsState {
  entries: LogEntryDTO[]
  refreshing: boolean
  /** Loads the most recent entries; throws when they cannot be read. */
  refresh: (options?: { level?: LogLevelName }) => Promise<void>
}

export const useLogsStore = create<LogsState>((set) => ({
  entries: [],
  refreshing: false,

  refresh: async (options = {}) => {
    set({ refreshing: true })
    try {
      const data = await logsApi.getRecentLogs({
        limit: ENTRY_LIMIT,
        ...(options.level ? { level: options.level } : {}),
      })
      set({ entries: data.entries })
    } finally {
      set({ refreshing: false })
    }
  },
}))
