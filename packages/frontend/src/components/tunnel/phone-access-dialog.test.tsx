import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react"
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
  getLanStatus: vi.fn(),
  enableLanAccess: vi.fn(),
  disableLanAccess: vi.fn(),
  getPhoneAccessPreferences: vi.fn(),
  updatePhoneAccessPreferences: vi.fn(),
}))

vi.mock("@/lib/api/tunnel", () => ({
  getTunnelStatus: mocks.getTunnelStatus,
  enableTunnel: mocks.enableTunnel,
  disableTunnel: mocks.disableTunnel,
}))

vi.mock("@/lib/api/lan", () => ({
  getLanStatus: mocks.getLanStatus,
  enableLanAccess: mocks.enableLanAccess,
  disableLanAccess: mocks.disableLanAccess,
}))

vi.mock("@/lib/api/phone-access", () => ({
  getPhoneAccessPreferences: mocks.getPhoneAccessPreferences,
  updatePhoneAccessPreferences: mocks.updatePhoneAccessPreferences,
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
const LAN_URL = "http://192.168.1.10:4322"

const tunnelInactive = {
  available: true,
  connected: true,
  active: false,
  url: URL,
}
const tunnelActive = { ...tunnelInactive, active: true }
const lanInactive = { active: false, port: 4322, addresses: ["192.168.1.10"] }
const lanActive = { ...lanInactive, active: true }

const preferences = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: { autoEnableOnStart: false, idleDisableMinutes: null },
}

const renderDialog = () =>
  render(
    <I18nProvider initialLocale="es">
      <PhoneAccessDialog open onOpenChange={() => {}} />
    </I18nProvider>,
  )

const openTailscaleTab = async () => {
  await userEvent.click(screen.getByRole("tab", { name: "Tailscale" }))
}

const activePanel = () => within(screen.getByRole("tabpanel"))

beforeEach(() => {
  useTunnelStore.setState({ status: null, lanStatus: null, preferences: null })
  mocks.getLanStatus.mockResolvedValue(lanInactive)
  mocks.getPhoneAccessPreferences.mockResolvedValue(preferences)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("PhoneAccessDialog", () => {
  it("muestra los ajustes del enlace en ambas pestañas", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)

    renderDialog()

    expect(
      await activePanel().findByText("Ajustes del enlace"),
    ).toBeInTheDocument()
    await openTailscaleTab()
    expect(
      await activePanel().findByText("Ajustes del enlace"),
    ).toBeInTheDocument()
  })

  it("activa el modo de red local desde su pestaña y muestra el QR", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.enableLanAccess.mockResolvedValue(lanActive)

    renderDialog()

    expect(await activePanel().findByText("Inactivo")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("switch", { name: "Compartir en mi red local" }),
    )

    await waitFor(() => expect(mocks.enableLanAccess).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(LAN_URL)).toBeInTheDocument()
  })

  it("permite elegir la dirección de red cuando hay varias", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.getLanStatus.mockResolvedValue({
      active: true,
      port: 4322,
      addresses: ["192.168.1.10", "10.0.0.5"],
    })

    renderDialog()

    expect(await screen.findByText(LAN_URL)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "10.0.0.5" }))

    expect(await screen.findByText("http://10.0.0.5:4322")).toBeInTheDocument()
  })

  it("copia el enlace local", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.getLanStatus.mockResolvedValue(lanActive)

    renderDialog()

    await userEvent.click(
      await activePanel().findByRole("button", { name: /Copiar enlace/ }),
    )

    expect(writeText).toHaveBeenCalledWith(LAN_URL)
  })

  it("activa la conexión de Tailscale desde su pestaña y muestra el QR", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.enableTunnel.mockResolvedValue(tunnelActive)

    renderDialog()
    await openTailscaleTab()

    expect(await activePanel().findByText("Inactivo")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    )

    await waitFor(() => expect(mocks.enableTunnel).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(URL)).toBeInTheDocument()
    expect(activePanel().getByText(/^Activo/)).toBeInTheDocument()
  })

  it("desactiva la conexión de Tailscale y oculta el QR", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelActive)
    mocks.disableTunnel.mockResolvedValue(tunnelInactive)

    renderDialog()
    await openTailscaleTab()

    expect(await screen.findByText(URL)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    )

    await waitFor(() => expect(mocks.disableTunnel).toHaveBeenCalledTimes(1))
    expect(await activePanel().findByText("Inactivo")).toBeInTheDocument()
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
    await openTailscaleTab()

    expect(
      await activePanel().findByText("Tailscale no está instalado"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Descargar Tailscale" }),
    ).toHaveAttribute("href", "https://tailscale.com/download")
    expect(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    ).toHaveAttribute("data-disabled")
  })

  it("muestra la guía de sesión cuando no hay conexión", async () => {
    mocks.getTunnelStatus.mockResolvedValue({
      available: true,
      connected: false,
      active: false,
      url: null,
    })

    renderDialog()
    await openTailscaleTab()

    expect(
      await activePanel().findByText(
        "Tailscale no está en ejecución o sin sesión",
      ),
    ).toBeInTheDocument()
    expect(
      activePanel().getByText(
        "Abre Tailscale en esta computadora e inicia sesión con tu cuenta.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    ).toHaveAttribute("data-disabled")
  })

  it("traduce el error del backend al fallar la activación de Tailscale", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.enableTunnel.mockRejectedValue(
      new ApiClientError(409, "TUNNEL_NOT_CONNECTED", "raw message"),
    )

    renderDialog()
    await openTailscaleTab()

    await activePanel().findByText("Inactivo")
    await userEvent.click(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    )

    expect(
      await screen.findByText(
        "Tailscale no está en ejecución o no tiene sesión iniciada en esta computadora.",
      ),
    ).toBeInTheDocument()
  })

  it("muestra el enlace de activación cuando Serve no está habilitado", async () => {
    mocks.getTunnelStatus.mockResolvedValue(tunnelInactive)
    mocks.enableTunnel.mockRejectedValue(
      new ApiClientError(
        409,
        "TUNNEL_SERVE_NOT_ENABLED",
        "Tailscale Serve is not enabled on this tailnet. Enable it at https://login.tailscale.com/f/serve?node=ABC123",
      ),
    )

    renderDialog()
    await openTailscaleTab()

    await activePanel().findByText("Inactivo")
    await userEvent.click(
      screen.getByRole("switch", { name: "Compartir en mi red privada" }),
    )

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
