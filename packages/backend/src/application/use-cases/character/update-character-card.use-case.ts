import { v7 as randomUUIDv7 } from "uuid"

import type { CharacterCardEnvelope } from "@workspace/shared/types/sillytavern-card"
import {
  MAX_LOREBOOK_ENTRIES,
  validateCardFieldSize,
} from "@workspace/shared/lib/sillytavern-card"

import { CharacterCard } from "../../../domain/entities/character-card.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { LorebookEntry } from "../../../domain/entities/lorebook-entry.entity"
import { Lorebook } from "../../../domain/entities/lorebook.entity"
import { LorebookVersion } from "../../../domain/entities/lorebook-version.entity"
import {
  CharacterNotFoundError,
  DomainError,
  LorebookValidationError,
} from "../../../domain/errors"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"

import {
  isRecord,
  serializeLorebookEntries,
  toLorebookCanonicalContent,
} from "./lorebook/lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./lorebook/source-key"
import {
  cardDataToVersionFields,
  lorebookVersionToCardLorebook,
  parseCardRoot,
  versionFieldsToCardData,
} from "./sillytavern-card.mapper"

export interface UpdateCharacterCardDeps {
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
}

export interface UpdateCharacterCardInput {
  characterId: string
  payload: unknown
}

export class UpdateCharacterCardUseCase {
  constructor(private readonly deps: UpdateCharacterCardDeps) {}

  async execute(
    input: UpdateCharacterCardInput,
  ): Promise<CharacterCardEnvelope> {
    const found = await this.deps.characterRepository.findById(input.characterId)
    if (!found) throw new CharacterNotFoundError(input.characterId)

    const parsed = parseCardRoot(input.payload)
    const fields = cardDataToVersionFields(parsed.data, parsed.root)

    const size = validateCardFieldSize(parsed.data)
    if (!size.ok) {
      throw new DomainError(
        "INVALID_CARD_FIELD_TOO_LARGE",
        `The card field '${size.field}' exceeds the allowed size.`,
        413,
      )
    }

    if (
      fields.lorebook &&
      fields.lorebook.entries.length > MAX_LOREBOOK_ENTRIES
    ) {
      throw new LorebookValidationError(
        `A lorebook can have at most ${MAX_LOREBOOK_ENTRIES} entries.`,
      )
    }

    const now = new Date()
    const newVersionId = randomUUIDv7()
    const cards = fields.knowledgeCards
      ? fields.knowledgeCards.map((card, index) =>
          CharacterCard.create({
            id: randomUUIDv7(),
            versionId: newVersionId,
            title: card.title,
            content: card.content,
            position: card.position ?? index,
            active: card.active ?? true,
          }),
        )
      : found.currentVersion.cards.map((card, index) =>
          CharacterCard.create({
            id: randomUUIDv7(),
            versionId: newVersionId,
            title: card.title,
            content: card.content,
            position: card.position ?? index,
            active: card.active,
          }),
        )

    const maxVersion = await this.deps.characterRepository.findMaxVersionNumber(
      input.characterId,
    )
    const saved = fields.lorebook
      ? await this.createLorebook(fields, now)
      : null
    const newVersion = CharacterVersion.create({
      id: newVersionId,
      characterId: input.characterId,
      name: fields.name,
      subtitle: fields.subtitle,
      profileImageAssetId: found.currentVersion.profileImageAssetId,
      description: fields.description,
      instructions: fields.instructions,
      greeting: fields.greeting,
      versionNumber: maxVersion + 1,
      createdAt: now,
      cards,
      personality: fields.personality,
      scenario: fields.scenario,
      mesExample: fields.mesExample,
      alternateGreetings: fields.alternateGreetings,
      creatorNotes: fields.creatorNotes,
      tags: fields.tags,
      creator: fields.creator,
      cardCharacterVersion: fields.cardCharacterVersion,
      gender: fields.gender,
      pronouns: fields.pronouns,
      tagline: fields.tagline,
      systemPrompt: fields.systemPrompt,
      postHistoryInstructions: fields.postHistoryInstructions,
      extensions: fields.extensions,
      unknownFields: fields.unknownFields,
      unknownRootFields: fields.unknownRootFields,
      lorebookVersionId: saved?.version.id ?? null,
    })

    await this.deps.characterRepository.saveVersion(newVersion)

    if (fields.name !== found.character.name) {
      await this.deps.characterRepository.update(
        found.character.withName(fields.name),
      )
    }

    const lorebook = saved
      ? lorebookVersionToCardLorebook(saved.version, {
          originId: saved.book.originId,
        })
      : null
    const data = versionFieldsToCardData(newVersion, lorebook)
    const rootExtras = isRecord(fields.unknownRootFields)
      ? fields.unknownRootFields
      : {}

    return {
      ...rootExtras,
      spec: "chara_card_v3",
      spec_version: "3.0",
      data,
    }
  }

  private async createLorebook(
    fields: ReturnType<typeof cardDataToVersionFields>,
    now: Date,
  ): Promise<{ book: Lorebook; version: LorebookVersion }> {
    const normalized = fields.lorebook!
    const book = Lorebook.create({
      id: randomUUIDv7(),
      characterId: null,
      name: normalized.name,
      description: normalized.description,
      scanDepth: normalized.scanDepth,
      tokenBudget: normalized.tokenBudget,
      recursiveScanning: normalized.recursiveScanning,
      extensions: normalized.extensions,
      unknownFields: normalized.unknownFields,
      originId: fields.rmLorebook?.originId ?? null,
      createdAt: now,
      updatedAt: now,
    })

    const entries = normalized.entries.map((entry, order) =>
      LorebookEntry.create({
        id: randomUUIDv7(),
        lorebookId: book.id,
        name: entry.name,
        sourceId: entry.sourceId,
        keys: entry.keys,
        secondaryKeys: entry.secondaryKeys,
        comment: entry.comment,
        content: entry.content,
        constant: entry.constant,
        selective: entry.selective,
        selectiveLogic: entry.selectiveLogic,
        insertionOrder: entry.insertionOrder,
        position: entry.position,
        rawPosition: entry.rawPosition,
        priority: entry.priority,
        enabled: entry.enabled,
        caseSensitive: entry.caseSensitive,
        wholeWords: entry.wholeWords,
        order,
        extensions: entry.extensions,
        unknownFields: entry.unknownFields,
        createdAt: now,
        updatedAt: now,
      }),
    )

    const version = LorebookVersion.create({
      id: randomUUIDv7(),
      lorebookId: book.id,
      versionNumber: 1,
      name: book.name,
      description: book.description,
      scanDepth: book.scanDepth,
      tokenBudget: book.tokenBudget,
      recursiveScanning: book.recursiveScanning,
      entriesJson: serializeLorebookEntries(entries),
      sourceKey: computeLorebookSourceKey(
        canonicalizeLorebookContent(toLorebookCanonicalContent(book, entries)),
      ),
      createdAt: now,
    })

    return this.deps.lorebookRepository.createContainerWithVersion(
      book,
      entries,
      version,
    )
  }
}
