import type { BackupResultDTO } from "@workspace/shared/types/update"

import type { UpdateController } from "../../../domain/ports/update-controller"

export class CreateBackupUseCase {
  constructor(private readonly controller: UpdateController) {}

  execute(): Promise<BackupResultDTO> {
    return this.controller.createBackup()
  }
}
