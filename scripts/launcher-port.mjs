#!/usr/bin/env node
/**
 * Port selection for the packaged launcher.
 *
 * Prints one line:
 *   running <port>  the app already answers on that port
 *   free <port>     nothing is listening there
 *   error <message> no usable port (or an explicit PORT is occupied)
 *
 * A second instance must never start: if our health endpoint answers, the
 * launcher opens that URL and exits. When the default port is busy with
 * another program, it tries the next one; an explicit PORT fails instead of
 * silently moving to a port the user did not configure.
 */
import net from "node:net"

const MAX_ATTEMPTS = 20
const HEALTH_TIMEOUT_MS = 800

const [portArg, explicitArg, hostArg] = process.argv.slice(2)
const requested = Number.parseInt(portArg ?? "", 10)
const explicit = explicitArg === "1"
const host = hostArg || "127.0.0.1"
const probeHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host

const isOurApp = async (port) => {
  try {
    const response = await fetch(`http://${probeHost}:${port}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    if (!response.ok) return false
    const body = await response.json()
    return body?.status === "ok" && typeof body?.database === "string"
  } catch {
    return false
  }
}

const isFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer()
    const done = (free) => {
      server.removeAllListeners()
      resolve(free)
    }
    server.once("error", () => done(false))
    server.once("listening", () => server.close(() => done(true)))
    server.listen({ port, host })
  })

const main = async () => {
  if (!Number.isInteger(requested) || requested < 1 || requested > 65535) {
    console.log("error Invalid port. Use a number between 1 and 65535.")
    return
  }

  const last = Math.min(requested + MAX_ATTEMPTS - 1, 65535)
  for (let port = requested; port <= last; port += 1) {
    if (await isOurApp(port)) {
      console.log(`running ${port}`)
      return
    }
    if (await isFree(port)) {
      console.log(`free ${port}`)
      return
    }
    if (explicit) {
      console.log(
        `error Port ${port} is already in use by another application. Set PORT to a free port.`,
      )
      return
    }
  }

  console.log(
    `error No free port found between ${requested} and ${last}. Set PORT to a free port.`,
  )
}

main().catch((error) => {
  console.log(`error Could not check the port: ${error.message}`)
})
