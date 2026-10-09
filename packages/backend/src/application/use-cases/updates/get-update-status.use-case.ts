import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

/** Returns the last known status (no network access). */
export class GetUpdateStatusUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(): Promise<UpdateStatusDTO> {
    return this.controller.getStatus()
  }
}
