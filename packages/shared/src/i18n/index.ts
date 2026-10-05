import { en } from "./locales/en"
import { es } from "./locales/es"
import type {
  Dictionary,
  Locale,
  PluralNode,
  TranslationKey,
  TranslationParams,
} from "./types"

export const DEFAULT_LOCALE: Locale = "en"
export const SUPPORTED_LOCALES: Locale[] = ["en", "es"]

const DICTIONARIES: Record<Locale, Dictionary> = { en, es }

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as string[]).includes(value)
}

function resolve(dictionary: Dictionary, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") {
      return (node as Record<string, unknown>)[part]
    }
    return undefined
  }, dictionary)
}

function isPluralNode(node: unknown): node is PluralNode {
  return (
    typeof node === "object" &&
    node !== null &&
    typeof (node as PluralNode).one === "string" &&
    typeof (node as PluralNode).other === "string"
  )
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * Resolves `key` in `locale`, interpolates `{param}` placeholders and picks the
 * singular/plural form when the node is a plural node and `count` is given.
 * Falls back to the key itself when it is missing.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: TranslationParams,
): string {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
  const node = resolve(dictionary, key)

  if (typeof node === "string") {
    return interpolate(node, params)
  }

  if (isPluralNode(node)) {
    const count = Number(params?.count ?? 0)
    return interpolate(count === 1 ? node.one : node.other, params)
  }

  return key
}

export function hasTranslation(locale: Locale, key: string): boolean {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
  return resolve(dictionary, key) !== undefined
}

export { en, es }
export type { Dictionary, Locale, TranslationKey, TranslationParams }
