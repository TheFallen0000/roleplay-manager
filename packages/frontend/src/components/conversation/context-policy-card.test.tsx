import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ContextPolicyCard } from "./context-policy-card"

const renderCard = (
  value: "fast" | "balanced" | "deep" = "balanced",
  locale: "es" | "en" = "es",
  onChange = vi.fn(),
) =>
  render(
    <I18nProvider initialLocale={locale}>
      <ContextPolicyCard value={value} onChange={onChange} />
    </I18nProvider>,
  )

afterEach(cleanup)

describe("ContextPolicyCard", () => {
  it("renders the policy label, value and description in Spanish", () => {
    renderCard("balanced")

    expect(screen.getByText("Política de contexto")).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Política de contexto" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Equilibrada")).toBeInTheDocument()
    expect(
      screen.getByText("Equilibrio entre memoria, resumen y velocidad."),
    ).toBeInTheDocument()
  })

  it("offers the three policies and reports a change", async () => {
    const onChange = vi.fn()
    renderCard("balanced", "es", onChange)

    await userEvent.click(
      screen.getByRole("combobox", { name: "Política de contexto" }),
    )

    expect(await screen.findByRole("option", { name: /Rápida/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Equilibrada/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Profunda/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("option", { name: /Profunda/ }))

    expect(onChange).toHaveBeenCalledWith("deep")
  })

  it("renders the policy copy in English", async () => {
    renderCard("deep", "en")

    expect(screen.getByText("Context policy")).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Context policy" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Deep")).toBeInTheDocument()
  })

  it("shows the embeddings hint only for deep", () => {
    renderCard("balanced")
    expect(screen.queryByText(/embeddings/i)).not.toBeInTheDocument()

    cleanup()
    renderCard("deep")
    expect(screen.getByText(/embeddings/i)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Abrir ajustes de proveedores" }),
    ).toHaveAttribute("href", "/settings/providers")
  })
})
