import { create } from "zustand"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import * as tunnelApi from "@/lib/api/tunnel"

/**
 * Last known tunnel status. It is cached in `localStorage` so the header
 * indicator survives page navigations (the app is an MPA) without polling the
 * backend on every load; the dialog refreshes it when opened.
 */
const STORAGE_KEY = "rm_tunnel_status"

const readCachedStatus = (): TunnelStatusDTO | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TunnelStatusDTO) : null
  } catch {
    return null
  }
}

const persistStatus = (status: TunnelStatusDTO): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

export interface TunnelState {
  status: TunnelStatusDTO | null
  refresh: () => Promise<TunnelStatusDTO>
  enable: () => Promise<TunnelStatusDTO>
  disable: () => Promise<TunnelStatusDTO>
  setStatus: (status: TunnelStatusDTO) => void
}

export const useTunnelStore = create<TunnelState>((set) => ({
  status: readCachedStatus(),

  refresh: async () => {
    const status = await tunnelApi.getTunnelStatus()
    persistStatus(status)
    set({ status })
    return status
  },

  enable: async () => {
    const status = await tunnelApi.enableTunnel()
    persistStatus(status)
    set({ status })
    return status
  },

  disable: async () => {
    const status = await tunnelApi.disableTunnel()
    persistStatus(status)
    set({ status })
    return status
  },

  setStatus: (status) => {
    persistStatus(status)
    set({ status })
  },
}))
