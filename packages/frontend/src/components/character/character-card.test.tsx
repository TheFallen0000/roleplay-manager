import {
  render as rtlRender,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import type {
  CharacterSummary,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"

import { CharacterCard } from "./character-card"

afterEach(() => {
  cleanup()
})

const character: CharacterSummary = {
  id: "char-1",
  name: "Lyra",
  subtitle: "Guardián del norte",
  profileImageAssetId: null,
  versionNumber: 3,
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-10T10:00:00.000Z",
}

const conversations: ConversationSummary[] = [
  {
    id: "conv-2",
    characterId: "char-1",
    characterName: "Lyra",
    profileImageAssetId: null,
    title: "Segunda aventura",
    messageCount: 12,
    lastActivityAt: "2026-07-12T10:00:00.000Z",
    createdAt: "2026-07-05T10:00:00.000Z",
    updatedAt: "2026-07-12T10:00:00.000Z",
  },
  {
    id: "conv-1",
    characterId: "char-1",
    characterName: "Lyra",
    profileImageAssetId: null,
    title: null,
    messageCount: 4,
    lastActivityAt: "2026-07-03T10:00:00.000Z",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z",
  },
]

const noop = () => {}

const renderCard = (props: Partial<Parameters<typeof CharacterCard>[0]> = {}) =>
  render(
    <CharacterCard
      character={character}
      conversations={conversations}
      lastActivityAt="2026-07-12T10:00:00.000Z"
      getVersions={async () => []}
      onImageClick={noop}
      onOpenConversation={noop}
      onCreateConversation={noop}
      onEdit={noop}
      onDelete={noop}
      {...props}
    />,
  )

const openMenu = async () => {
  fireEvent.contextMenu(screen.getByRole("button", { name: /Abrir la/ }))
  await screen.findByText("Conversación más reciente")
}

describe("CharacterCard", () => {
  it("muestra nombre, versión, fecha de creación y última actividad", () => {
    renderCard()

    expect(screen.getByText("Lyra")).toBeInTheDocument()
    expect(screen.getByText("Guardián del norte")).toBeInTheDocument()
    expect(screen.getByText("v3")).toBeInTheDocument()
    expect(screen.getByText(/Creado:/)).toBeInTheDocument()
    expect(screen.getByText(/Última actividad:/)).toBeInTheDocument()
    expect(
      screen.getByLabelText("Abrir la conversación más reciente con Lyra"),
    ).toBeInTheDocument()
  })

  it("llama onImageClick al pulsar la imagen", () => {
    const onImageClick = vi.fn()
    renderCard({ onImageClick })

    fireEvent.click(
      screen.getByLabelText("Abrir la conversación más reciente con Lyra"),
    )
    expect(onImageClick).toHaveBeenCalledWith(character)
  })

  it("abre el context menu con las acciones de PM.6", async () => {
    renderCard()
    await openMenu()

    expect(screen.getByText("Conversación más reciente")).toBeInTheDocument()
    expect(screen.getByText("Nueva conversación")).toBeInTheDocument()
    expect(screen.getByText("Conversaciones")).toBeInTheDocument()
    expect(screen.getByText("Editar personaje")).toBeInTheDocument()
    expect(screen.getByText("Exportar…")).toBeInTheDocument()
    expect(screen.getByText("Eliminar personaje")).toBeInTheDocument()
  })

  it("abre el diálogo de confirmación al pulsar Eliminar personaje", async () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    await openMenu()

    fireEvent.click(screen.getByText("Eliminar personaje"))
    expect(await screen.findByText("¿Eliminar personaje?")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Eliminar"))
    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith("char-1"),
    )
  })

  it("deshabilita Ir a la más reciente cuando no hay conversaciones", async () => {
    renderCard({ conversations: [] })
    await openMenu()

    const item = await screen.findByText("Conversación más reciente")
    expect(item.closest("[data-slot=context-menu-item]")).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })
})
