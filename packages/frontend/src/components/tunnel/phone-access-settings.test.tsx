import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PhoneAccessPreferencesResponseDTO } from "@workspace/shared/types/phone-access"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
import { PhoneAccessSettings } from "./phone-access-settings"

const mocks = vi.hoisted(() => ({
  getPhoneAccessPreferences: vi.fn(),
  updatePhoneAccessPreferences: vi.fn(),
}))

vi.mock("@/lib/api/phone-access", () => ({
  getPhoneAccessPreferences: mocks.getPhoneAccessPreferences,
  updatePhoneAccessPreferences: mocks.updatePhoneAccessPreferences,
}))

const preferences: PhoneAccessPreferencesResponseDTO = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: { autoEnableOnStart: false, idleDisableMinutes: null },
}

const renderSettings = (mode: "tailscale" | "lan" = "tailscale") =>
  render(
    <I18nProvider initialLocale="es">
      <PhoneAccessSettings mode={mode} />
    </I18nProvider>,
  )

const expand = () =>
  userEvent.click(screen.getByRole("button", { name: /Ajustes del enlace/ }))

beforeEach(() => {
  useTunnelStore.setState({ preferences })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useTunnelStore.setState({ preferences: null })
})

describe("PhoneAccessSettings", () => {
  it("resume los ajustes activos en la fila plegada", () => {
    renderSettings()

    expect(
      screen.getByRole("button", { name: /Ajustes del enlace/ }),
    ).toHaveTextContent("Al cerrar: desactivar")
  })

  it("muestra «Sin ajustes activos» cuando todo está apagado", () => {
    useTunnelStore.setState({
      preferences: {
        tailscale: {
          autoEnableOnStart: false,
          disableOnClose: false,
          idleDisableMinutes: null,
        },
        lan: { autoEnableOnStart: false, idleDisableMinutes: null },
      },
    })

    renderSettings()

    expect(
      screen.getByRole("button", { name: /Ajustes del enlace/ }),
    ).toHaveTextContent("Sin ajustes activos")
  })

  it("guarda el auto-encendido al expandir y tocar el interruptor", async () => {
    mocks.updatePhoneAccessPreferences.mockResolvedValue({
      ...preferences,
      tailscale: { ...preferences.tailscale, autoEnableOnStart: true },
    })

    renderSettings()
    await expand()
    await userEvent.click(
      screen.getByRole("switch", { name: "Activar al iniciar la app" }),
    )

    await waitFor(() =>
      expect(mocks.updatePhoneAccessPreferences).toHaveBeenCalledWith({
        mode: "tailscale",
        autoEnableOnStart: true,
      }),
    )
  })

  it("activa la inactividad con 60 minutos por defecto y muestra el selector", async () => {
    mocks.updatePhoneAccessPreferences.mockResolvedValue({
      ...preferences,
      tailscale: { ...preferences.tailscale, idleDisableMinutes: 60 },
    })

    renderSettings()
    await expand()
    await userEvent.click(
      screen.getByRole("switch", { name: "Desactivar por inactividad" }),
    )

    await waitFor(() =>
      expect(mocks.updatePhoneAccessPreferences).toHaveBeenCalledWith({
        mode: "tailscale",
        idleDisableMinutes: 60,
      }),
    )
    expect(
      screen.getByRole("button", { name: /Ajustes del enlace/ }),
    ).toHaveTextContent("Inactividad: 60 min")
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("el modo LAN no ofrece desactivar al cerrar", async () => {
    renderSettings("lan")
    await expand()

    expect(
      screen.queryByRole("switch", { name: "Desactivar al cerrar la app" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("switch", { name: "Activar al iniciar la app" }),
    ).toBeInTheDocument()
  })

  it("muestra un error si no se pueden guardar los ajustes", async () => {
    mocks.updatePhoneAccessPreferences.mockRejectedValue(new Error("nope"))

    renderSettings()
    await expand()
    await userEvent.click(
      screen.getByRole("switch", { name: "Activar al iniciar la app" }),
    )

    expect(
      await screen.findByText("No se pudieron guardar los ajustes."),
    ).toBeInTheDocument()
  })
})
