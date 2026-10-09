import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import type { TunnelController } from "../../../domain/ports/tunnel-controller"

/** Returns the tunnel status (never fails: the adapter degrades on its own). */
export class GetTunnelStatusUseCase {
  constructor(private readonly controller: TunnelController) {}

  execute(): Promise<TunnelStatusDTO> {
    return this.controller.getStatus()
  }
}
