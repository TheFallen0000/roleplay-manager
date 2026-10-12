import { describe, expect, it } from "vitest"

import type { Locale } from "@workspace/shared/i18n"

import {
  TUTORIAL_CATEGORIES,
  filterTutorials,
  getTutorialContent,
  isTutorialId,
  listTutorials,
} from "./catalog"

const LOCALES: Locale[] = ["es", "en"]

describe("tutorial catalog", () => {
  it("covers every tutorial in both locales", () => {
    for (const locale of LOCALES) {
      const content = getTutorialContent(locale)
      for (const entry of listTutorials(locale)) {
        const tutorial = content[entry.id]
        expect(tutorial.title.length).toBeGreaterThan(0)
        expect(tutorial.description.length).toBeGreaterThan(0)
        expect(tutorial.steps.length).toBeGreaterThanOrEqual(2)
        expect(tutorial.tips.length).toBeGreaterThan(0)
        for (const step of tutorial.steps) {
          expect(step.title.length).toBeGreaterThan(0)
          expect(step.body.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("assigns every tutorial to a known, non-empty category", () => {
    const entries = listTutorials("es")
    const categoryIds = TUTORIAL_CATEGORIES.map((category) => category.id)
    for (const entry of entries) {
      expect(categoryIds).toContain(entry.category)
    }
    for (const category of TUTORIAL_CATEGORIES) {
      expect(entries.some((entry) => entry.category === category.id)).toBe(true)
    }
  })

  it("keeps tutorial ids unique and valid", () => {
    const ids = listTutorials("es").map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(isTutorialId(id)).toBe(true)
    }
    expect(isTutorialId("does-not-exist")).toBe(false)
  })

  it("points optional actions at internal routes", () => {
    for (const locale of LOCALES) {
      for (const entry of listTutorials(locale)) {
        if (entry.content.action) {
          expect(entry.content.action.href.startsWith("/")).toBe(true)
          expect(entry.content.action.label.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("filters by content, ignoring case and accents", () => {
    const entries = listTutorials("es")

    expect(filterTutorials(entries, "")).toHaveLength(entries.length)

    const byBody = filterTutorials(entries, "TÚNEL").map((entry) => entry.id)
    expect(byBody).toContain("phone-access")

    const byTitle = filterTutorials(entries, "ramas").map((entry) => entry.id)
    expect(byTitle).toContain("branches")
    expect(byTitle.length).toBeLessThan(entries.length)

    expect(filterTutorials(entries, "zzzz")).toEqual([])
  })
})
