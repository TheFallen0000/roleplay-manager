import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/stores/updates.store", () => ({
  useUpdatesStore: (
    selector: (state: Record<string, unknown>) => unknown,
  ) =>
    selector({
      status: null,
      hydrateFromCache: () => {},
      shouldCheck: () => false,
      check: async () => {},
    }),
}))

vi.mock("./app-menubar", () => ({
  AppMenubar: () => <div data-testid="app-menubar" />,
}))

vi.mock("@/components/tunnel/phone-access-notice", () => ({
  PhoneAccessNotice: () => null,
}))

import { AppShell } from "./app-shell"

afterEach(() => {
  cleanup()
})

const renderShell = (pathname: string) =>
  render(
    <AppShell locale="es" pathname={pathname}>
      <div />
    </AppShell>,
  )

const linkByHref = (href: string): HTMLElement | undefined =>
  screen
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href)

describe("AppShell — Biblioteca group", () => {
  it("groups Characters, Lorebooks and Played characters under Biblioteca", () => {
    renderShell("/")

    expect(screen.getByText("Biblioteca")).toBeInTheDocument()
    expect(linkByHref("/")).toBeDefined()
    expect(linkByHref("/lorebooks")).toBeDefined()
    expect(linkByHref("/player-characters")).toBeDefined()
  })

  it("marks only the matching route with aria-current=page", () => {
    renderShell("/lorebooks")

    expect(linkByHref("/lorebooks")).toHaveAttribute("aria-current", "page")
    expect(linkByHref("/")).not.toHaveAttribute("aria-current")
    expect(linkByHref("/player-characters")).not.toHaveAttribute(
      "aria-current",
    )
  })

  it("keeps the characters root and played characters routes distinct", () => {
    renderShell("/player-characters")

    expect(linkByHref("/player-characters")).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(linkByHref("/")).not.toHaveAttribute("aria-current")
    expect(linkByHref("/lorebooks")).not.toHaveAttribute("aria-current")
  })

  it("does not mark a nested route as the characters root", () => {
    renderShell("/characters/new")

    expect(screen.getByText("Biblioteca")).toBeInTheDocument()
    expect(linkByHref("/")).not.toHaveAttribute("aria-current")
  })
})
