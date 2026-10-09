import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

export interface ApplyUpdateInput {
  /** Create a backup before pulling (default true). */
  withBackup: boolean
}

/** Starts the update in the background (progress goes in `job`). */
export class ApplyUpdateUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(input: ApplyUpdateInput): Promise<UpdateStatusDTO> {
    return this.controller.apply({ withBackup: input.withBackup })
  }
}
