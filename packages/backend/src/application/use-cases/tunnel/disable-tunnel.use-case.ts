import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import { TunnelNotAvailableError } from "../../../domain/errors"
import type { TunnelController } from "../../../domain/ports/tunnel-controller"

/** Deja de compartir la app en la red privada (idempotente). */
export class DisableTunnelUseCase {
  constructor(private readonly controller: TunnelController) {}

  async execute(): Promise<TunnelStatusDTO> {
    const status = await this.controller.getStatus()
    if (!status.available) {
      throw new TunnelNotAvailableError()
    }
    return this.controller.disable()
  }
}
