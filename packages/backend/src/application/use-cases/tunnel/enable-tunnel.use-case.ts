import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import {
  TunnelNotAvailableError,
  TunnelNotConnectedError,
} from "../../../domain/errors"
import type { PhoneAccessActivity } from "../../../domain/ports/phone-access-activity"
import type { TunnelController } from "../../../domain/ports/tunnel-controller"

/** Comparte la app en la red privada (idempotente). */
export class EnableTunnelUseCase {
  constructor(
    private readonly controller: TunnelController,
    private readonly activity: PhoneAccessActivity,
  ) {}

  async execute(): Promise<TunnelStatusDTO> {
    const status = await this.controller.getStatus()
    if (!status.available) {
      throw new TunnelNotAvailableError()
    }
    if (!status.connected) {
      throw new TunnelNotConnectedError()
    }
    const enabled = await this.controller.enable()
    // Enabling counts as use: the idle watchdog starts counting from here.
    this.activity.touch("tailscale")
    return enabled
  }
}
