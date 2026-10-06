import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"

/** Deja de compartir la app en la red local (idempotente). */
export class DisableLanAccessUseCase {
  constructor(private readonly controller: LanAccessController) {}

  execute(): Promise<LanAccessStatusDTO> {
    return this.controller.disable()
  }
}
