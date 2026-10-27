import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTunnelStore } from "@/lib/stores/tunnel.store"

const mocks = vi.hoisted(() => ({
  getPhoneAccessNotice: vi.fn(),
}))

vi.mock("@/lib/api/phone-access", () => ({
  getPhoneAccessNotice: mocks.getPhoneAccessNotice,
  getPhoneAccessPreferences: vi.fn(),
  updatePhoneAccessPreferences: vi.fn(),
}))

import { PhoneAccessNotice } from "./phone-access-notice"

const notice = {
  mode: "tailscale" as const,
  minutes: 30,
  at: "2026-10-27T12:00:00.000Z",
}

const renderNotice = () =>
  render(
    <I18nProvider initialLocale="es">
      <PhoneAccessNotice />
    </I18nProvider>,
  )

beforeEach(() => {
  localStorage.clear()
  useTunnelStore.setState({ notice: null })
  mocks.getPhoneAccessNotice.mockResolvedValue(notice)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe("PhoneAccessNotice", () => {
  it("shows the inactivity notice once and remembers it", async () => {
    renderNotice()

    expect(
      await screen.findByText("Enlace del teléfono desactivado"),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }))

    expect(localStorage.getItem("rm_phone_access_notice_seen")).toBe(notice.at)
  })

  it("does not show a notice that was already seen", async () => {
    localStorage.setItem("rm_phone_access_notice_seen", notice.at)
    renderNotice()

    await waitFor(() =>
      expect(mocks.getPhoneAccessNotice).toHaveBeenCalledTimes(1),
    )
    expect(
      screen.queryByText("Enlace del teléfono desactivado"),
    ).not.toBeInTheDocument()
  })
})
