import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render as rtlRender,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"

import type { CharacterSummary } from "@workspace/shared/types/character"
import { I18nProvider } from "@/lib/hooks/i18n-provider"

const mocks = vi.hoisted(() => ({
  applySettingsTemplate: vi.fn(),
}))

vi.mock("@/lib/api/characters", () => ({
  applySettingsTemplate: mocks.applySettingsTemplate,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

import { ApplySettingsDialog } from "./apply-settings-dialog"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const character: CharacterSummary = {
  id: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
}

const template = {
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-10-06T10:00:00.000Z",
  character: {
    id: "char-2",
    name: "Mira",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  },
  standaloneSettings: {
    model: "gpt-4o-mini",
    provider: "ollama",
    providerInstanceId: null,
    temperature: 0.9,
    maxTokens: 1024,
    recentMessageCount: 8,
    memoryDecayMode: "off",
  },
}

const renderDialog = (props: Partial<Parameters<typeof ApplySettingsDialog>[0]> = {}) => {
  const onOpenChange = vi.fn()
  render(
    <ApplySettingsDialog
      character={character}
      conversationCount={2}
      open
      onOpenChange={onOpenChange}
      {...props}
    />,
  )
  return { onOpenChange }
}

const dropTemplate = (content: unknown) => {
  const file = new File([JSON.stringify(content)], "settings.json", {
    type: "application/json",
  })
  fireEvent.drop(
    screen.getByRole("button", { name: /Suelta aquí el JSON de ajustes/ }),
    { dataTransfer: { files: [file] } },
  )
}

describe("ApplySettingsDialog", () => {
  it("parses a dropped template, summarizes it and applies it", async () => {
    mocks.applySettingsTemplate.mockResolvedValue({ applied: 2, warnings: [] })
    const { onOpenChange } = renderDialog()

    dropTemplate(template)

    expect(await screen.findByText("gpt-4o-mini")).toBeInTheDocument()
    expect(screen.getByText(/Temperatura \(0.9\)/)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "Aplicar ajustes" }),
    )

    await waitFor(() =>
      expect(mocks.applySettingsTemplate).toHaveBeenCalledWith(
        "char-1",
        expect.objectContaining({ model: "gpt-4o-mini", temperature: 0.9 }),
      ),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows a translated error when the file has no template", async () => {
    renderDialog()

    dropTemplate({ kind: "character-export", schemaVersion: 1 })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "plantilla de ajustes",
    )
  })

  it("warns and keeps the disabled apply state when there are no conversations", () => {
    renderDialog({ conversationCount: 0 })

    expect(
      screen.getByText("Este personaje aún no tiene conversaciones."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Aplicar ajustes" }),
    ).toBeDisabled()
  })
})
