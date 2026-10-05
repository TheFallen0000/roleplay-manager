import type { en } from "./locales/en"

export type Locale = "en" | "es"

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>
}

/** Shape every locale dictionary must satisfy (same keys, any strings). */
export type Dictionary = DeepString<typeof en>

export interface PluralNode {
  one: string
  other: string
}

/**
 * Dot paths to every leaf of the dictionary. Plural nodes (`{ one, other }`)
 * count as leaves, so `t("characters.count", { count })` is valid.
 */
export type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends PluralNode
      ? K
      : `${K}.${DotPaths<T[K]>}`
}[keyof T & string]

export type TranslationKey = DotPaths<Dictionary>

export type TranslationParams = Record<string, string | number>
