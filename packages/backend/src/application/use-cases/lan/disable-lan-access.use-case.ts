import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"

/** Stops sharing the app on the local network (idempotent). */
export class DisableLanAccessUseCase {
  constructor(private readonly controller: LanAccessController) {}

  execute(): Promise<LanAccessStatusDTO> {
    return this.controller.disable()
  }
}
