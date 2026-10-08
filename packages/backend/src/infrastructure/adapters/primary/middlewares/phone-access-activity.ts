import type { RequestHandler } from "express"

import type { PhoneAccessActivity } from "../../../../domain/ports/phone-access-activity"
import { LAN_ACCESS_MARKER_HEADER } from "../../secondary/lan/lan-proxy-server.adapter"

/** Tailscale Serve always proxies under the tailnet's `*.ts.net` name. */
const TAILSCALE_HOST = /\.ts\.net$/i

/**
 * Registra el uso remoto del enlace telefónico, para que el vigilante de
 * inactividad sepa cuándo se usó cada modo por última vez. Las peticiones
 * locales (el navegador de la PC) no cuentan.
 */
export const buildPhoneAccessActivityMiddleware = (
  activity: PhoneAccessActivity,
): RequestHandler => {
  return (req, _res, next) => {
    if (req.headers[LAN_ACCESS_MARKER_HEADER]) {
      activity.touch("lan")
    } else if (TAILSCALE_HOST.test(req.hostname)) {
      activity.touch("tailscale")
    }
    next()
  }
}
