import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import type { TunnelController } from "../../../domain/ports/tunnel-controller"

/** Devuelve el estado del túnel (nunca falla: el adaptador degrada solo). */
export class GetTunnelStatusUseCase {
  constructor(private readonly controller: TunnelController) {}

  execute(): Promise<TunnelStatusDTO> {
    return this.controller.getStatus()
  }
}
