import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ApiClientError } from "@/lib/api/client"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
import { PhoneAccessDialog } from "./phone-access-dialog"

const mocks = vi.hoisted(() => ({
  getTunnelStatus: vi.fn(),
  enableTunnel: vi.fn(),
  disableTunnel: vi.fn(),
}))

vi.mock("@/lib/api/tunnel", () => ({
  getTunnelStatus: mocks.getTunnelStatus,
  enableTunnel: mocks.enableTunnel,
  disableTunnel: mocks.disableTunnel,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

const URL = "https://desktop.tailnet-abc.ts.net"

const renderDialog = () =>
  render(
    <I18nProvider initialLocale="es">
      <PhoneAccessDialog open onOpenChange={() => {}} />
    </I18nProvider>,
  )

beforeEach(() => {
  useTunnelStore.setState({ status: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("PhoneAccessDialog", () => {
  it("activa la conexión desde el interruptor y muestra el QR", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: true,
      active: false,
      url: URL,
    })
    mocks.enableTunnel.mockResolvedValue({
      available: true,
      connected: true,
      active: true,
      url: URL,
    })

    renderDialog()

    expect(await screen.findByText("Inactivo")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("switch"))

    await waitFor(() => expect(mocks.enableTunnel).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(URL)).toBeInTheDocument()
    expect(screen.getByText(/^Activo/)).toBeInTheDocument()
  })

  it("desactiva la conexión y oculta el QR", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: true,
      active: true,
      url: URL,
    })
    mocks.disableTunnel.mockResolvedValue({
      available: true,
      connected: true,
      active: false,
      url: URL,
    })

    renderDialog()

    expect(await screen.findByText(URL)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("switch"))

    await waitFor(() => expect(mocks.disableTunnel).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("Inactivo")).toBeInTheDocument()
    expect(screen.queryByText(URL)).not.toBeInTheDocument()
  })

  it("muestra la guía de instalación cuando falta Tailscale", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: false,
      connected: false,
      active: false,
      url: null,
    })

    renderDialog()

    expect(
      await screen.findByText("Tailscale no está instalado"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Descargar Tailscale" }),
    ).toHaveAttribute("href", "https://tailscale.com/download")
    expect(screen.getByRole("switch")).toHaveAttribute("data-disabled")
  })

  it("muestra la guía de sesión cuando no hay conexión", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: false,
      active: false,
      url: null,
    })

    renderDialog()

    expect(
      await screen.findByText("Tailscale no está en ejecución o sin sesión"),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Abre Tailscale en esta computadora e inicia sesión con tu cuenta.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("switch")).toHaveAttribute("data-disabled")
  })

  it("traduce el error del backend al fallar la activación", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: true,
      active: false,
      url: URL,
    })
    mocks.enableTunnel.mockRejectedValue(
      new ApiClientError(409, "TUNNEL_NOT_CONNECTED", "raw message"),
    )

    renderDialog()

    await screen.findByText("Inactivo")
    await userEvent.click(screen.getByRole("switch"))

    expect(
      await screen.findByText(
        "Tailscale no está en ejecución o no tiene sesión iniciada en esta computadora.",
      ),
    ).toBeInTheDocument()
  })

  it("copia el enlace al portapapeles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: true,
      active: true,
      url: URL,
    })

    renderDialog()

    await userEvent.click(
      await screen.findByRole("button", { name: /Copiar enlace/ }),
    )

    expect(writeText).toHaveBeenCalledWith(URL)
  })

  it("muestra el enlace de activación cuando Serve no está habilitado", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: true,
      active: false,
      url: URL,
    })
    mocks.enableTunnel.mockRejectedValue(
      new ApiClientError(
        409,
        "TUNNEL_SERVE_NOT_ENABLED",
        "Tailscale Serve is not enabled on this tailnet. Enable it at https://login.tailscale.com/f/serve?node=ABC123",
      ),
    )

    renderDialog()

    await screen.findByText("Inactivo")
    await userEvent.click(screen.getByRole("switch"))

    expect(
      await screen.findByText(
        "Tailscale Serve aún no está habilitado en tu tailnet. Actívalo una vez (el enlace abre Tailscale).",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Activar Serve en Tailscale" }),
    ).toHaveAttribute(
      "href",
      "https://login.tailscale.com/f/serve?node=ABC123",
    )
  })
})
