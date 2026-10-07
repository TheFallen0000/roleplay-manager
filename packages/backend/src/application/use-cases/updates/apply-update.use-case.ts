import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

export interface ApplyUpdateInput {
  /** Create a backup before pulling (default true). */
  withBackup: boolean
}

/** Inicia la actualización en segundo plano (el progreso va en `job`). */
export class ApplyUpdateUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(input: ApplyUpdateInput): Promise<UpdateStatusDTO> {
    return this.controller.apply({ withBackup: input.withBackup })
  }
}
