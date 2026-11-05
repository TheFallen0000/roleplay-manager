import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import type { ContextManifestDTO } from "@workspace/shared/types/context"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ContextManifestView } from "./context-manifest-view"

const manifest: ContextManifestDTO = {
  version: 1,
  model: "llama3",
  contextWindow: 8_000,
  outputReserve: 2_048,
  estimatedInputTokens: 600,
  estimatedTotalTokens: 2_648,
  compaction: { needed: true, applied: false, threshold: 80 },
  summary: {
    id: null,
    firstMessageId: null,
    lastMessageId: null,
    messagesAfter: 2,
  },
  memories: { total: 0, included: 0, excluded: 0 },
  messages: { afterSummary: 2, pending: 1, excluded: 0, total: 3 },
  sections: [
    {
      id: "character",
      source: "system",
      tokens: 512,
      characters: 900,
      included: true,
      reason: "Character definition and instructions",
    },
    {
      id: "history",
      source: "history",
      tokens: 333,
      characters: 210,
      included: true,
      reason: "Conversation history after the summary",
      itemCount: 2,
    },
    {
      id: "pending",
      source: "pending",
      tokens: 777,
      characters: 150,
      included: false,
      reason: "Pending message not yet persisted",
      itemCount: 1,
    },
  ],
}

const renderView = (value: ContextManifestDTO = manifest) =>
  render(
    <I18nProvider initialLocale="en">
      <ContextManifestView manifest={value} />
    </I18nProvider>,
  )

afterEach(cleanup)

describe("ContextManifestView", () => {
  it("renders the title and the estimated input token count", () => {
    renderView()

    expect(screen.getByText("Context manifest")).toBeTruthy()
    expect(screen.getByText("Estimated input: 600 tokens")).toBeTruthy()
  })

  it("renders section labels for character, history and pending", () => {
    renderView()

    expect(screen.getByText("Character")).toBeTruthy()
    expect(screen.getByText("History")).toBeTruthy()
    expect(screen.getByText("Pending message")).toBeTruthy()
  })

  it("shows tokens per section and the included/excluded state", () => {
    renderView()

    expect(screen.getByText(/512/)).toBeTruthy()
    expect(screen.getByText(/777/)).toBeTruthy()
    expect(screen.getAllByText("Included").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Excluded").length).toBeGreaterThan(0)
  })

  it("shows the compaction state from manifest.compaction", () => {
    renderView()

    expect(screen.getByText(/Compaction/)).toBeTruthy()
    expect(screen.getByText(/needed/)).toBeTruthy()
    expect(screen.queryByText(/applied/)).toBeNull()
  })

  it("shows applied when compaction ran", () => {
    renderView({
      ...manifest,
      compaction: { needed: true, applied: true, threshold: 80 },
    })

    expect(screen.getByText(/applied/)).toBeTruthy()
  })

  it("uses the section reason as supporting text", () => {
    renderView()

    expect(
      screen.getByText("Character definition and instructions"),
    ).toBeTruthy()
  })

  it("renders without crashing when sections is empty", () => {
    renderView({ ...manifest, sections: [] })

    expect(screen.getByText("Context manifest")).toBeTruthy()
  })
})
