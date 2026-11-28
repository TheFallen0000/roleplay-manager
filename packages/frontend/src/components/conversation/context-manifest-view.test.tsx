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
  contextPolicy: "balanced",
  budget: {
    window: 8_000,
    outputReserve: 2_048,
    memory: 960,
    summaryOutput: 800,
    summaryMemory: 960,
    compactionThreshold: 80,
    compactionTarget: 60,
  },
  compaction: { needed: true, applied: false, threshold: 80 },
  summary: {
    id: null,
    firstMessageId: null,
    lastMessageId: null,
    messagesAfter: 2,
  },
  memories: { total: 0, included: 0, excluded: 0, selection: [] },
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

const renderView = (
  value: ContextManifestDTO = manifest,
  locale: "es" | "en" = "en",
) =>
  render(
    <I18nProvider initialLocale={locale}>
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

  it("shows why each memory was included or excluded", () => {
    renderView({
      ...manifest,
      memories: {
        total: 3,
        included: 2,
        excluded: 1,
        selection: [
          { id: "mem-1", included: true, score: 7.5, reason: "actor" },
          { id: "mem-2", included: true, score: 3, reason: "keyword" },
          { id: "mem-3", included: false, score: 0, reason: "budget" },
        ],
      },
    })

    expect(screen.getByText(/mem-1/)).toBeTruthy()
    expect(screen.getByText(/actor/i)).toBeTruthy()
    expect(screen.getByText(/mem-3/)).toBeTruthy()
    expect(screen.getByText(/budget/i)).toBeTruthy()
  })
})

const deepManifest: ContextManifestDTO = {
  ...manifest,
  contextPolicy: "deep",
  budget: {
    window: 8_000,
    outputReserve: 2_048,
    memory: 1_440,
    summaryOutput: 1_200,
    summaryMemory: 1_440,
    compactionThreshold: 90,
    compactionTarget: 70,
  },
  sections: [
    {
      id: "memories",
      source: "system",
      tokens: 1_440,
      characters: 3_200,
      included: true,
      reason: "included memories",
      itemCount: 18,
    },
    {
      id: "summary",
      source: "system",
      tokens: 1_200,
      characters: 2_600,
      included: true,
      reason: "previous summary",
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
  ],
}

describe("ContextManifestView policy budget", () => {
  it("renders the policy and the resolved budget", () => {
    renderView(deepManifest)

    expect(screen.getAllByText(/Policy/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Deep/).length).toBeGreaterThan(0)
    expect(screen.getByText("Policy budget")).toBeTruthy()
    expect(screen.getByText("Memory cap: 1440 tokens")).toBeTruthy()
    expect(screen.getByText("Summary output cap: 1200 tokens")).toBeTruthy()
    expect(screen.getByText("Summary memory cap: 1440 tokens")).toBeTruthy()
    expect(screen.getByText("Compaction: 90% → 70%")).toBeTruthy()
  })

  it("shows tokens and cap for a section at its cap", () => {
    renderView(deepManifest)

    expect(screen.getByText("1440 / 1440")).toBeTruthy()
    expect(screen.getByText("1200 / 1200")).toBeTruthy()
  })

  it("warns with aria-live when a section reaches its policy cap", async () => {
    renderView(deepManifest)

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status.textContent).toMatch(/policy cap/i)

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss warning" }),
    )

    expect(screen.queryByRole("status")).toBeNull()
  })

  it("warns when the context window is unknown", () => {
    renderView({
      ...manifest,
      contextWindow: null,
      budget: { ...manifest.budget!, window: null },
    })

    expect(screen.getByRole("status").textContent).toMatch(/window unknown/i)
  })

  it("renders the budget warnings in Spanish and lets the user dismiss them", async () => {
    renderView(deepManifest, "es")

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status.textContent).toMatch(/límite/i)

    await userEvent.click(
      screen.getByRole("button", { name: "Descartar aviso" }),
    )

    expect(screen.queryByRole("status")).toBeNull()
  })

  it("does not warn when every section is below its cap", () => {
    renderView()

    expect(screen.queryByRole("status")).toBeNull()
  })
})
