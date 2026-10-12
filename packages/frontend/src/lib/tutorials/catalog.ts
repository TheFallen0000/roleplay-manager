import type { LucideIcon } from "lucide-react"
import {
  AppWindowIcon,
  BookOpenTextIcon,
  CpuIcon,
  DatabaseIcon,
  PaletteIcon,
  SmartphoneIcon,
  SplitIcon,
  UsersIcon,
  WifiIcon,
} from "lucide-react"

import type { Locale, TranslationKey } from "@workspace/shared/i18n"

import { tutorialsEn } from "./content.en"
import { tutorialsEs } from "./content.es"
import type {
  Tutorial,
  TutorialCategoryId,
  TutorialContent,
  TutorialId,
} from "./types"

export interface TutorialCategoryDefinition {
  id: TutorialCategoryId
  labelKey: TranslationKey
  icon: LucideIcon
}

export interface TutorialMeta {
  id: TutorialId
  category: TutorialCategoryId
  icon: LucideIcon
}

export interface TutorialEntry extends TutorialMeta {
  content: Tutorial
}

export const TUTORIAL_CATEGORIES: readonly TutorialCategoryDefinition[] = [
  { id: "mobile", labelKey: "tutorials.categoryMobile", icon: SmartphoneIcon },
  { id: "ai", labelKey: "tutorials.categoryAi", icon: CpuIcon },
  { id: "play", labelKey: "tutorials.categoryPlay", icon: UsersIcon },
  {
    id: "custom",
    labelKey: "tutorials.categoryCustom",
    icon: PaletteIcon,
  },
]

/** Display order of the tutorials; both locales share it. */
const TUTORIAL_META: readonly TutorialMeta[] = [
  { id: "phone-access", category: "mobile", icon: SmartphoneIcon },
  { id: "pwa-install", category: "mobile", icon: AppWindowIcon },
  { id: "lan-access", category: "mobile", icon: WifiIcon },
  { id: "providers", category: "ai", icon: CpuIcon },
  { id: "characters", category: "play", icon: UsersIcon },
  { id: "branches", category: "play", icon: SplitIcon },
  { id: "memory-summaries", category: "play", icon: BookOpenTextIcon },
  { id: "chat-customization", category: "custom", icon: PaletteIcon },
  { id: "data-updates", category: "custom", icon: DatabaseIcon },
]

export const getTutorialContent = (locale: Locale): TutorialContent =>
  locale === "en" ? tutorialsEn : tutorialsEs

export const isTutorialId = (value: string): value is TutorialId =>
  TUTORIAL_META.some((meta) => meta.id === value)

export const listTutorials = (locale: Locale): TutorialEntry[] => {
  const content = getTutorialContent(locale)
  return TUTORIAL_META.map((meta) => ({ ...meta, content: content[meta.id] }))
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

const matches = (tutorial: Tutorial, needle: string) =>
  normalize(
    [
      tutorial.title,
      tutorial.description,
      ...tutorial.steps.flatMap((step) => [step.title, step.body]),
      ...tutorial.tips,
    ].join(" "),
  ).includes(needle)

/** Filters by title, description, steps and tips, ignoring case and accents. */
export const filterTutorials = (
  entries: readonly TutorialEntry[],
  query: string,
): TutorialEntry[] => {
  const needle = normalize(query.trim())
  if (!needle) return [...entries]
  return entries.filter((entry) => matches(entry.content, needle))
}
