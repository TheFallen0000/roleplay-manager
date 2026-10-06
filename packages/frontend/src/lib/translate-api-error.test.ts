import { describe, it, expect } from "vitest"

import { ApiClientError } from "./api/client"
import { extractTunnelServeUrl, translateApiError } from "./translate-api-error"

const tRaw = (key: string, fallback: string) =>
  key === "errors.CHARACTER_NOT_FOUND" ? "El personaje ya no existe." : fallback

describe("translateApiError", () => {
  it("traduce por código cuando existe", () => {
    const error = new ApiClientError(404, "CHARACTER_NOT_FOUND", "raw message")

    expect(translateApiError(error, tRaw, "fallback")).toBe(
      "El personaje ya no existe.",
    )
  })

  it("cae al mensaje crudo si el código no tiene traducción", () => {
    const error = new ApiClientError(500, "SOMETHING_ELSE", "raw message")

    expect(translateApiError(error, tRaw, "fallback")).toBe("raw message")
  })

  it("cae al fallback si no es un error de API", () => {
    expect(translateApiError(new Error("boom"), tRaw, "fallback")).toBe(
      "fallback",
    )
  })
})

describe("extractTunnelServeUrl", () => {
  it("devuelve el enlace de activación del mensaje del backend", () => {
    const error = new ApiClientError(
      409,
      "TUNNEL_SERVE_NOT_ENABLED",
      "Tailscale Serve is not enabled on this tailnet. Enable it at https://login.tailscale.com/f/serve?node=ABC123",
    )

    expect(extractTunnelServeUrl(error)).toBe(
      "https://login.tailscale.com/f/serve?node=ABC123",
    )
  })

  it("devuelve null para otros códigos o errores", () => {
    expect(
      extractTunnelServeUrl(
        new ApiClientError(
          409,
          "TUNNEL_NOT_CONNECTED",
          "https://login.tailscale.com/f/serve?node=ABC123",
        ),
      ),
    ).toBeNull()
    expect(extractTunnelServeUrl(new Error("boom"))).toBeNull()
  })
})
