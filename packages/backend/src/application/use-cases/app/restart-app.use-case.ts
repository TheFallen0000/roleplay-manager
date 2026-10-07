import type { AppRestarter } from "../../../domain/ports/app-restarter"

export type RestartAppResult =
  | { restarting: true }
  | { restarting: false; reason: "not-available" }

/**
 * Relaunches the app so a freshly installed update takes effect. Only available
 * in the packaged app (the launcher can start it again); in development it
 * reports `not-available`.
 */
export class RestartAppUseCase {
  constructor(private readonly restarter: AppRestarter) {}

  execute(): RestartAppResult {
    if (!this.restarter.available()) {
      return { restarting: false, reason: "not-available" }
    }
    this.restarter.restart()
    return { restarting: true }
  }
}
