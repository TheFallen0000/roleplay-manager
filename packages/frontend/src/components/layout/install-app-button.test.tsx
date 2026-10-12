import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { InstallAppButton } from "./install-app-button"

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const setUserAgent = (userAgent: string, maxTouchPoints = 0) => {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  })
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints,
  })
}

const setStandalone = (standalone: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: standalone })),
  })
}

const fakePromptEvent = () => {
  const prompt = vi.fn(async () => undefined)
  const event: Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  } = Object.assign(new Event("beforeinstallprompt"), {
    prompt,
    userChoice: Promise.resolve({ outcome: "dismissed" as const }),
  })
  return { event, prompt }
}

const renderButton = () =>
  render(
    <I18nProvider initialLocale="es">
      <InstallAppButton />
    </I18nProvider>,
  )

afterEach(() => {
  cleanup()
  window.__rmInstallPrompt = null
  setUserAgent(DESKTOP_UA)
  setStandalone(false)
})

describe("InstallAppButton", () => {
  it("en iOS muestra el aviso con enlace al tutorial", async () => {
    setUserAgent(IPHONE_UA, 5)

    renderButton()

    expect(
      await screen.findByRole("link", {
        name: "Añádela a la pantalla de inicio",
      }),
    ).toHaveAttribute("href", "/tutorials?t=pwa-install")
  })

  it("lanza el prompt capturado y desaparece al descartarlo", async () => {
    setUserAgent(ANDROID_UA, 5)
    const { event, prompt } = fakePromptEvent()
    window.__rmInstallPrompt = event

    renderButton()

    await userEvent.click(
      await screen.findByRole("button", { name: "Instalar la app" }),
    )

    expect(prompt).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Instalar la app" }),
      ).not.toBeInTheDocument(),
    )
  })

  it("no muestra nada en escritorio sin prompt", async () => {
    setUserAgent(DESKTOP_UA)

    renderButton()

    await vi.waitFor(() =>
      expect(screen.queryByRole("button")).not.toBeInTheDocument(),
    )
  })

  it("no muestra nada si la app ya corre instalada", async () => {
    setUserAgent(ANDROID_UA, 5)
    setStandalone(true)
    window.__rmInstallPrompt = fakePromptEvent().event

    renderButton()

    await vi.waitFor(() =>
      expect(screen.queryByRole("button")).not.toBeInTheDocument(),
    )
  })
})
