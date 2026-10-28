import type { Request, RequestHandler } from "express"

import { HttpError } from "./error-handler"

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/** The proxy forwards the original host because it strips `Host` upstream. */
const forwardedHost = (req: Request): string | null => {
  const value = req.get("x-forwarded-host")
  if (!value) return null
  const first = value.split(",")[0]?.trim()
  return first || null
}

const originsForHost = (host: string): string[] => {
  const hosts = new Set([host])
  if (host.endsWith(":80")) hosts.add(host.slice(0, -3))
  if (host.endsWith(":443")) hosts.add(host.slice(0, -4))

  const origins = new Set<string>()
  for (const candidate of hosts) {
    origins.add(`http://${candidate}`)
    origins.add(`https://${candidate}`)
  }
  return [...origins]
}

/**
 * Rejects browser requests that change state from another origin.
 *
 * CORS only prevents reading the response of a cross-origin request; a simple
 * form POST still reaches the server. The API has state-changing endpoints
 * without a JSON body (backups, LAN/tunnel toggle, update actions), so check
 * `Origin` and `Sec-Fetch-Site` before parsing anything. Requests without
 * either header (curl, CLI, SSR) are allowed because they are not browser
 * CSRF vectors.
 */
export const buildApiOriginGuard = (corsOrigin: string): RequestHandler => {
  const configuredOrigin = normalizeOrigin(corsOrigin)

  return (req, _res, next) => {
    if (!STATE_CHANGING_METHODS.has(req.method)) {
      next()
      return
    }

    const fetchSite = req.get("sec-fetch-site")
    if (fetchSite === "cross-site") {
      next(
        new HttpError(
          403,
          "CROSS_ORIGIN_REQUEST",
          "Cross-origin request rejected.",
        ),
      )
      return
    }

    const originHeader = req.get("origin")
    if (!originHeader) {
      if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
        next(
          new HttpError(
            403,
            "CROSS_ORIGIN_REQUEST",
            "Cross-origin request rejected.",
          ),
        )
        return
      }
      next()
      return
    }

    const origin = normalizeOrigin(originHeader)
    if (!origin) {
      next(
        new HttpError(
          403,
          "CROSS_ORIGIN_REQUEST",
          "Cross-origin request rejected.",
        ),
      )
      return
    }

    const allowed = new Set<string>()
    if (configuredOrigin) allowed.add(configuredOrigin)

    const host = forwardedHost(req) ?? req.get("host")
    if (host) {
      for (const candidate of originsForHost(host)) allowed.add(candidate)
    }

    if (!allowed.has(origin)) {
      next(
        new HttpError(
          403,
          "CROSS_ORIGIN_REQUEST",
          "Cross-origin request rejected.",
        ),
      )
      return
    }

    next()
  }
}
