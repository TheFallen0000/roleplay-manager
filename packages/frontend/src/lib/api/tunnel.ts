import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import { apiRequest } from "./client"

export const getTunnelStatus = (): Promise<TunnelStatusDTO> =>
  apiRequest<TunnelStatusDTO>("/api/tunnel")

export const enableTunnel = (): Promise<TunnelStatusDTO> =>
  apiRequest<TunnelStatusDTO>("/api/tunnel/enable", { method: "POST" })

export const disableTunnel = (): Promise<TunnelStatusDTO> =>
  apiRequest<TunnelStatusDTO>("/api/tunnel/disable", { method: "POST" })
