import type {
  BackupResultDTO,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"

import { apiRequest } from "./client"

export const getUpdateStatus = (): Promise<UpdateStatusDTO> =>
  apiRequest<UpdateStatusDTO>("/api/updates")

export const checkUpdates = (): Promise<UpdateStatusDTO> =>
  apiRequest<UpdateStatusDTO>("/api/updates/check", { method: "POST" })

export const applyUpdate = (withBackup: boolean): Promise<UpdateStatusDTO> =>
  apiRequest<UpdateStatusDTO>("/api/updates/apply", {
    method: "POST",
    body: JSON.stringify({ withBackup }),
  })

export const createBackup = (): Promise<BackupResultDTO> =>
  apiRequest<BackupResultDTO>("/api/updates/backup", { method: "POST" })
