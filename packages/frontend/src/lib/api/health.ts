import { apiRequest } from "./client"

/** Cheap request used to know when the app is up again (after a restart). */
export const getHealth = (): Promise<unknown> =>
  apiRequest<unknown>("/api/health")
