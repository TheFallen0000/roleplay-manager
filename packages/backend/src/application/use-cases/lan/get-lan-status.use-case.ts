import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"

export class GetLanStatusUseCase {
  constructor(private readonly controller: LanAccessController) {}

  execute(): Promise<LanAccessStatusDTO> {
    return this.controller.getStatus()
  }
}
