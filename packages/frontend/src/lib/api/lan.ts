import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import { apiRequest } from "./client"

export const getLanStatus = (): Promise<LanAccessStatusDTO> =>
  apiRequest<LanAccessStatusDTO>("/api/lan")

export const enableLanAccess = (): Promise<LanAccessStatusDTO> =>
  apiRequest<LanAccessStatusDTO>("/api/lan/enable", { method: "POST" })

export const disableLanAccess = (): Promise<LanAccessStatusDTO> =>
  apiRequest<LanAccessStatusDTO>("/api/lan/disable", { method: "POST" })
