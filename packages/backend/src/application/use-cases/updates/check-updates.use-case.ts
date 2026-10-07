import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

/** Consulta la rama seguida y refresca el estado. */
export class CheckUpdatesUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(): Promise<UpdateStatusDTO> {
    return this.controller.check()
  }
}
