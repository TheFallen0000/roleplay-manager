import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"

/** Comparte la app en la red local (idempotente). */
export class EnableLanAccessUseCase {
  constructor(private readonly controller: LanAccessController) {}

  execute(): Promise<LanAccessStatusDTO> {
    return this.controller.enable()
  }
}
