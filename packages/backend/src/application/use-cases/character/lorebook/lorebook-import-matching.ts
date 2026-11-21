import { MAX_LOREBOOK_ENTRIES } from "@workspace/shared/lib/sillytavern-card"

import type { Lorebook } from "../../../../domain/entities/lorebook.entity"
import type { LorebookVersion } from "../../../../domain/entities/lorebook-version.entity"
import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import {
  assertLorebookEntryCount,
  buildLorebookEntities,
  isRecord,
  normalizeLorebook,
  toLorebookCanonicalContent,
  type LorebookEntities,
  type NormalizedLorebook,
} from "./lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

export type LorebookMatchKind =
  | "live-identical"
  | "deleted-identical"
  | "live-different"
  | "deleted-different"
  | "none"

export interface ParsedLorebookImport {
  root: unknown
  normalized: NormalizedLorebook
  entities: LorebookEntities
  originId: string | null
  sourceKey: string
}

export interface LorebookMatch {
  kind: LorebookMatchKind
  book: Lorebook | null
  matchedVersionNumber: number | null
}

const invalidPayload = (): DomainError =>
  new DomainError(
    "INVALID_CARD_JSON",
    "The payload is not a SillyTavern lorebook.",
    400,
  )

const readOriginId = (extensions: unknown): string | null => {
  if (!isRecord(extensions) || !isRecord(extensions.rm)) return null
  const originId = extensions.rm.originId
  return typeof originId === "string" && originId.length > 0 ? originId : null
}

export const parseLorebookImport = (payload: string): ParsedLorebookImport => {
  let root: unknown
  try {
    root = JSON.parse(payload)
  } catch {
    throw new DomainError(
      "INVALID_CARD_JSON",
      "The lorebook payload is not valid JSON.",
      400,
    )
  }

  const normalized = normalizeLorebook(root)
  if (!normalized) throw invalidPayload()
  assertLorebookEntryCount(normalized, MAX_LOREBOOK_ENTRIES)

  const entities = buildLorebookEntities(root, null)
  if (!entities) throw invalidPayload()

  return {
    root,
    normalized,
    entities,
    originId: readOriginId(normalized.extensions),
    sourceKey: computeLorebookSourceKey(
      canonicalizeLorebookContent(
        toLorebookCanonicalContent(entities.book, entities.entries),
      ),
    ),
  }
}

interface Candidate {
  book: Lorebook
  identicalVersion: LorebookVersion | null
}

const hasCurrentMatch = (candidate: Candidate): boolean =>
  candidate.book.currentVersionId !== null &&
  candidate.identicalVersion?.id === candidate.book.currentVersionId

const compareCandidates = (left: Candidate, right: Candidate): number => {
  const leftDeleted = left.book.deletedAt !== null ? 1 : 0
  const rightDeleted = right.book.deletedAt !== null ? 1 : 0
  if (leftDeleted !== rightDeleted) return leftDeleted - rightDeleted

  if (hasCurrentMatch(left) !== hasCurrentMatch(right)) {
    return hasCurrentMatch(left) ? -1 : 1
  }

  return left.book.createdAt.getTime() - right.book.createdAt.getTime()
}

const classify = (
  candidate: Candidate,
): { kind: LorebookMatchKind; matchedVersionNumber: number | null } => {
  const deleted = candidate.book.deletedAt !== null
  const identical = candidate.identicalVersion !== null

  if (deleted) {
    return {
      kind: identical ? "deleted-identical" : "deleted-different",
      matchedVersionNumber: candidate.identicalVersion?.versionNumber ?? null,
    }
  }

  return {
    kind: identical ? "live-identical" : "live-different",
    matchedVersionNumber: candidate.identicalVersion?.versionNumber ?? null,
  }
}

const fromOrigin = async (
  repository: LorebookRepository,
  originId: string,
  sourceKey: string,
): Promise<Candidate[]> => {
  const books = await repository.findBooksByOriginId(originId)
  return Promise.all(
    books.map(async (book) => {
      const versions = await repository.findVersions(book.id)
      const matches = versions.filter(
        (version) => version.sourceKey === sourceKey,
      )
      return {
        book,
        identicalVersion:
          matches.find((version) => version.id === book.currentVersionId) ??
          matches[0] ??
          null,
      }
    }),
  )
}

const fromSourceKey = async (
  repository: LorebookRepository,
  sourceKey: string,
): Promise<Candidate[]> => {
  const versions = await repository.findVersionsBySourceKey(sourceKey)
  const byBook = new Map<string, LorebookVersion[]>()

  for (const version of versions) {
    const group = byBook.get(version.lorebookId) ?? []
    group.push(version)
    byBook.set(version.lorebookId, group)
  }

  const candidates: Candidate[] = []
  for (const [bookId, bookVersions] of byBook) {
    const found = await repository.findById(bookId)
    if (!found) continue
    candidates.push({
      book: found.book,
      identicalVersion:
        bookVersions.find(
          (version) => version.id === found.book.currentVersionId,
        ) ??
        bookVersions[0] ??
        null,
    })
  }

  return candidates
}

export const resolveLorebookMatch = async (
  repository: LorebookRepository,
  sourceKey: string,
  originId: string | null,
): Promise<LorebookMatch> => {
  const originCandidates = originId
    ? await fromOrigin(repository, originId, sourceKey)
    : []

  const candidates = originCandidates.length > 0
    ? originCandidates
    : await fromSourceKey(repository, sourceKey)

  if (candidates.length === 0) {
    return { kind: "none", book: null, matchedVersionNumber: null }
  }

  const [candidate] = [...candidates].sort(compareCandidates)
  const { kind, matchedVersionNumber } = classify(candidate)

  return { kind, book: candidate.book, matchedVersionNumber }
}

const impliedKinds: Record<string, LorebookMatchKind[]> = {
  reuse: ["live-identical"],
  restore: ["deleted-identical"],
  "new-version": ["live-different"],
  "new-book": ["none", "deleted-different"],
}

export const assertActionMatches = (
  action: string,
  kind: LorebookMatchKind,
): void => {
  if (impliedKinds[action]?.includes(kind)) return

  if (action === "reuse" && kind === "deleted-identical") {
    throw new DomainError(
      "IMPORT_STALE_MATCH",
      "The matched lorebook changed after the preview.",
      409,
    )
  }

  throw new DomainError(
    "IMPORT_ACTION_MISMATCH",
    `The '${action}' action does not match the '${kind}' lorebook match.`,
    409,
  )
}
