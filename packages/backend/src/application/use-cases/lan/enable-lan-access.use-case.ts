import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"
import type { PhoneAccessActivity } from "../../../domain/ports/phone-access-activity"

/** Shares the app on the local network (idempotent). */
export class EnableLanAccessUseCase {
  constructor(
    private readonly controller: LanAccessController,
    private readonly activity: PhoneAccessActivity,
  ) {}

  async execute(): Promise<LanAccessStatusDTO> {
    const status = await this.controller.enable()
    // Enabling counts as use: the idle watchdog starts counting from here.
    this.activity.touch("lan")
    return status
  }
}
