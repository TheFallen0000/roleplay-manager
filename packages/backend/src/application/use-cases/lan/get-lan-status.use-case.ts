import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"

/** Devuelve el estado del acceso por red local. */
export class GetLanStatusUseCase {
  constructor(private readonly controller: LanAccessController) {}

  execute(): Promise<LanAccessStatusDTO> {
    return this.controller.getStatus()
  }
}
