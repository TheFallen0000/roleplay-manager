import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { EmbeddingConfigDTO } from "@workspace/shared/types/embedding"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { EmbeddingSettings } from "./embedding-settings"

const mocks = vi.hoisted(() => ({
  getEmbeddingConfig: vi.fn(),
  setEmbeddingConfig: vi.fn(),
  reindexMemoryEmbeddings: vi.fn(),
}))

vi.mock("@/lib/api/embeddings", () => ({
  getEmbeddingConfig: mocks.getEmbeddingConfig,
  setEmbeddingConfig: mocks.setEmbeddingConfig,
  reindexMemoryEmbeddings: mocks.reindexMemoryEmbeddings,
}))

const ollamaConfig: EmbeddingConfigDTO = {
  provider: "ollama",
  providerInstanceId: null,
  models: { ollama: "nomic-embed-text" },
  hasApiKey: false,
  enabled: true,
  dimension: 8,
  status: { indexed: 2, missing: 1 },
}

const remoteConfig: EmbeddingConfigDTO = {
  provider: "openai-compatible",
  providerInstanceId: "inst-1",
  models: { openaiCompatible: "text-embedding-3-small" },
  hasApiKey: true,
  enabled: true,
  dimension: 1536,
  status: { indexed: 1, missing: 0 },
}

const renderSettings = () =>
  render(
    <I18nProvider initialLocale="es">
      <EmbeddingSettings />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.getEmbeddingConfig.mockResolvedValue(ollamaConfig)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EmbeddingSettings", () => {
  it("loads the config and shows the provider, model and index status", async () => {
    renderSettings()

    expect(
      await screen.findByRole("heading", { name: /embeddings/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/proveedor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument()
    expect(screen.getByText(/2.*indexad/i)).toBeInTheDocument()
    expect(screen.getByText(/1.*pendiente/i)).toBeInTheDocument()
    expect(mocks.getEmbeddingConfig).toHaveBeenCalledWith()
  })

  it("warns that memory text leaves the device when a remote provider is selected", async () => {
    mocks.getEmbeddingConfig.mockResolvedValue(remoteConfig)

    renderSettings()

    expect(
      await screen.findByText(/sale del dispositivo/i),
    ).toBeInTheDocument()
  })

  it("reindexes and refreshes the index status", async () => {
    mocks.reindexMemoryEmbeddings.mockResolvedValue({
      indexed: 3,
      missing: 0,
      failed: 0,
    })
    mocks.getEmbeddingConfig
      .mockResolvedValueOnce(ollamaConfig)
      .mockResolvedValueOnce({
        ...ollamaConfig,
        status: { indexed: 3, missing: 0 },
      })

    renderSettings()
    await screen.findByRole("heading", { name: /embeddings/i })

    await userEvent.click(
      screen.getByRole("button", { name: /reindexar/i }),
    )

    await waitFor(() =>
      expect(mocks.reindexMemoryEmbeddings).toHaveBeenCalledWith(),
    )
    expect(await screen.findByText(/3.*indexad/i)).toBeInTheDocument()
    expect(screen.getByText(/0.*pendiente/i)).toBeInTheDocument()
  })

  it("uses the translation dictionary instead of hardcoded copy", async () => {
    renderSettings()

    await screen.findByRole("heading", { name: /embeddings/i })

    // The Spanish dictionary owns the copy; the component must not print the
    // raw key. This guards against a hardcoded label sneaking in.
    expect(screen.queryByText("providers.embeddingHeading")).not.toBeInTheDocument()
  })
})
