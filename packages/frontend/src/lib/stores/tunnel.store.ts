import { create } from "zustand"

import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"
import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import * as lanApi from "@/lib/api/lan"
import * as tunnelApi from "@/lib/api/tunnel"

/**
 * Last known status of the phone-access modes (Tailscale tunnel and LAN).
 * They are cached in `localStorage` so the header indicator survives page
 * navigations (the app is an MPA) without querying the backend on every load;
 * the dialog refreshes them when opened.
 */
const TUNNEL_STORAGE_KEY = "rm_tunnel_status"
const LAN_STORAGE_KEY = "rm_lan_status"

const readCached = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

const persist = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

export interface TunnelState {
  status: TunnelStatusDTO | null
  lanStatus: LanAccessStatusDTO | null
  /**
   * Loads the statuses cached in `localStorage` once on the client. Kept out of
   * the initial state so SSR and the first client render match (a cached dot
   * in the initial state caused a hydration mismatch).
   */
  hydrateFromCache: () => void
  refresh: () => Promise<TunnelStatusDTO>
  enable: () => Promise<TunnelStatusDTO>
  disable: () => Promise<TunnelStatusDTO>
  setStatus: (status: TunnelStatusDTO) => void
  refreshLan: () => Promise<LanAccessStatusDTO>
  enableLan: () => Promise<LanAccessStatusDTO>
  disableLan: () => Promise<LanAccessStatusDTO>
}

export const useTunnelStore = create<TunnelState>((set) => ({
  status: null,
  lanStatus: null,

  hydrateFromCache: () => {
    const cachedTunnel = readCached<TunnelStatusDTO>(TUNNEL_STORAGE_KEY)
    const cachedLan = readCached<LanAccessStatusDTO>(LAN_STORAGE_KEY)
    set((state) => ({
      status: cachedTunnel ?? state.status,
      lanStatus: cachedLan ?? state.lanStatus,
    }))
  },

  refresh: async () => {
    const status = await tunnelApi.getTunnelStatus()
    persist(TUNNEL_STORAGE_KEY, status)
    set({ status })
    return status
  },

  enable: async () => {
    const status = await tunnelApi.enableTunnel()
    persist(TUNNEL_STORAGE_KEY, status)
    set({ status })
    return status
  },

  disable: async () => {
    const status = await tunnelApi.disableTunnel()
    persist(TUNNEL_STORAGE_KEY, status)
    set({ status })
    return status
  },

  setStatus: (status) => {
    persist(TUNNEL_STORAGE_KEY, status)
    set({ status })
  },

  refreshLan: async () => {
    const lanStatus = await lanApi.getLanStatus()
    persist(LAN_STORAGE_KEY, lanStatus)
    set({ lanStatus })
    return lanStatus
  },

  enableLan: async () => {
    const lanStatus = await lanApi.enableLanAccess()
    persist(LAN_STORAGE_KEY, lanStatus)
    set({ lanStatus })
    return lanStatus
  },

  disableLan: async () => {
    const lanStatus = await lanApi.disableLanAccess()
    persist(LAN_STORAGE_KEY, lanStatus)
    set({ lanStatus })
    return lanStatus
  },
}))
