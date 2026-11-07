import { describe, expect, it, vi } from "vitest"

import { PreviewSillyTavernCardUseCase } from "./preview-sillytavern-card.use-case"
import {
  buildCardPngFixture,
} from "../../../test-utils/png-fixtures"
import {
  buildCCv3Entry,
  buildLorebookCCv3,
  buildV1Card,
  buildV3Card,
} from "../../../test-utils/sillytavern-fixtures"

const buildRepos = () => ({
  characterRepository: {
    createWithFirstVersion: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findVersionById: vi.fn(),
    findVersionsByCharacterId: vi.fn(),
    findMaxVersionNumber: vi.fn(),
    saveVersion: vi.fn(),
    updateProfileImageAssetId: vi.fn(),
  },
  lorebookRepository: {
    findByCharacterId: vi.fn(),
    upsertBook: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    reorderEntries: vi.fn(),
    replaceBook: vi.fn(),
  },
})

const buildUseCase = (repos = buildRepos()) =>
  new PreviewSillyTavernCardUseCase(repos as never)

describe("PreviewSillyTavernCardUseCase", () => {
  it("returns the card summary and lorebook entry count without persisting", async () => {
    const repos = buildRepos()

    const preview = await buildUseCase(repos).execute({
      format: "json",
      payload: JSON.stringify(
        buildV3Card({
          character_book: buildLorebookCCv3([
            buildCCv3Entry({ keys: ["dragon"] }),
            buildCCv3Entry({ keys: ["forest"] }),
          ]).data,
        })
      ),
    })

    expect(preview).toMatchObject({
      name: "Lyra",
      description: "A guardian of the forest.",
      tags: ["fantasy", "guardian"],
      creator: "Card Author",
      lorebookEntryCount: 2,
      cardVersion: "v3",
    })
    expect(preview.warnings).toContain("IMAGE_ABSENT")
    expect(preview.warnings).not.toContain("V1_CARD")
    expect(repos.characterRepository.createWithFirstVersion).not.toHaveBeenCalled()
    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })

  it("warns about a V1 card", async () => {
    const preview = await buildUseCase().execute({
      format: "json",
      payload: JSON.stringify(buildV1Card()),
    })

    expect(preview.cardVersion).toBe("v1")
    expect(preview.warnings).toContain("V1_CARD")
  })

  it("warns about empty description and greeting", async () => {
    const preview = await buildUseCase().execute({
      format: "json",
      payload: JSON.stringify(
        buildV3Card({
          description: "  ",
          first_mes: "",
          alternate_greetings: [],
        })
      ),
    })

    expect(preview.warnings).toEqual(
      expect.arrayContaining(["EMPTY_DESCRIPTION", "EMPTY_GREETING"])
    )
  })

  it("warns about regex, timed effects and missing images", async () => {
    const preview = await buildUseCase().execute({
      format: "json",
      payload: JSON.stringify(
        buildV3Card({
          character_book: buildLorebookCCv3([
            buildCCv3Entry({
              use_regex: true,
              cooldown: 3,
              delay: 1,
              sticky: 2,
            }),
          ]).data,
        })
      ),
    })

    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        "REGEX_IGNORED",
        "TIMED_EFFECTS_PRESERVED",
        "IMAGE_ABSENT",
      ])
    )
  })

  it("previews a PNG card from base64", async () => {
    const png = buildCardPngFixture({
      ccv3: JSON.stringify(buildV3Card({ name: "Png Lyra" })),
    })

    const preview = await buildUseCase().execute({
      format: "png",
      payload: png.toString("base64"),
    })

    expect(preview.name).toBe("Png Lyra")
    expect(preview.warnings).not.toContain("IMAGE_ABSENT")
  })
})
