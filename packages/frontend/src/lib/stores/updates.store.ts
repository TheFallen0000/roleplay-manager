import { create } from "zustand"

import type {
  BackupResultDTO,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"
import type { RestartAppResult } from "@/lib/api/updates"

import * as updatesApi from "@/lib/api/updates"

const STORAGE_KEY = "rm_update_status"
const NOTIFIED_KEY = "rm_update_notified"
const CHECK_TTL_MS = 60 * 60 * 1000

const readCached = (): UpdateStatusDTO | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UpdateStatusDTO) : null
  } catch {
    return null
  }
}

const persist = (status: UpdateStatusDTO): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

let inFlight: Promise<UpdateStatusDTO> | null = null

export interface UpdatesState {
  status: UpdateStatusDTO | null
  checking: boolean
  /** Loads the cached status once on the client (SSR-safe). */
  hydrateFromCache: () => void
  /** Whether the cached check is old enough to run again. */
  shouldCheck: () => boolean
  /** Fetches the tracked branch (deduplicates concurrent calls). */
  check: () => Promise<UpdateStatusDTO>
  /** Reads the last known status without touching the network. */
  refresh: () => Promise<UpdateStatusDTO>
  apply: (withBackup: boolean) => Promise<UpdateStatusDTO>
  createBackup: () => Promise<BackupResultDTO>
  restart: () => Promise<RestartAppResult>
  wasNotified: (version: string) => boolean
  markNotified: (version: string) => void
}

export const useUpdatesStore = create<UpdatesState>((set, get) => ({
  status: null,
  checking: false,

  hydrateFromCache: () => {
    const cached = readCached()
    if (cached) set({ status: cached })
  },

  shouldCheck: () => {
    const status = get().status
    if (!status?.checkedAt) return true
    return Date.now() - Date.parse(status.checkedAt) > CHECK_TTL_MS
  },

  check: () => {
    if (inFlight) return inFlight
    set({ checking: true })
    inFlight = (async () => {
      try {
        const status = await updatesApi.checkUpdates()
        persist(status)
        set({ status })
        return status
      } finally {
        set({ checking: false })
        inFlight = null
      }
    })()
    return inFlight
  },

  refresh: async () => {
    const status = await updatesApi.getUpdateStatus()
    persist(status)
    set({ status })
    return status
  },

  apply: async (withBackup) => {
    const status = await updatesApi.applyUpdate(withBackup)
    persist(status)
    set({ status })
    return status
  },

  createBackup: () => updatesApi.createBackup(),

  restart: () => updatesApi.restartApp(),

  wasNotified: (version) => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(NOTIFIED_KEY) === version
    } catch {
      return false
    }
  },

  markNotified: (version) => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(NOTIFIED_KEY, version)
    } catch {
      // Ignore storage failures.
    }
  },
}))
