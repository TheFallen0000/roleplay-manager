import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

/** Devuelve el último estado conocido (sin salir a la red). */
export class GetUpdateStatusUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(): Promise<UpdateStatusDTO> {
    return this.controller.getStatus()
  }
}
