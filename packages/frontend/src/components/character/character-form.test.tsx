import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CharacterForm } from "./character-form"

afterEach(() => {
  cleanup()
})

describe("CharacterForm — S132 create tabs", () => {
  it("shows the Personaje and Lorebook tabs when creating", () => {
    render(<CharacterForm locale="es" />)

    expect(screen.getByRole("tab", { name: /Personaje/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Lorebook/i })).toBeInTheDocument()
  })

  it("keeps the lorebook tab reachable from /characters/new", () => {
    render(<CharacterForm locale="es" />)

    expect(screen.getByRole("tab", { name: /Lorebook/i })).not.toBeDisabled()
  })
})
