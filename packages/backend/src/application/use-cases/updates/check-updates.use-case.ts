import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

export class CheckUpdatesUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(): Promise<UpdateStatusDTO> {
    return this.controller.check()
  }
}
