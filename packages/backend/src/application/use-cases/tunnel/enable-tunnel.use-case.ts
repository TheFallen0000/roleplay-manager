import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import {
  TunnelNotAvailableError,
  TunnelNotConnectedError,
} from "../../../domain/errors"
import type { TunnelController } from "../../../domain/ports/tunnel-controller"

/** Comparte la app en la red privada (idempotente). */
export class EnableTunnelUseCase {
  constructor(private readonly controller: TunnelController) {}

  async execute(): Promise<TunnelStatusDTO> {
    const status = await this.controller.getStatus()
    if (!status.available) {
      throw new TunnelNotAvailableError()
    }
    if (!status.connected) {
      throw new TunnelNotConnectedError()
    }
    return this.controller.enable()
  }
}
