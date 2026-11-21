const STOPWORDS = new Set<string>([
  // Spanish
  "a", "al", "algo", "algunas", "alguno", "algunos", "ante", "antes", "aquel",
  "aquella", "aquellas", "aquellos", "aqui", "asi", "aun", "bajo", "bien",
  "cada", "casi", "como", "con", "contra", "cual", "cuales", "cuando", "de",
  "del", "desde", "donde", "dos", "durante", "el", "ella", "ellas", "ellos",
  "en", "entre", "era", "eran", "es", "esa", "esas", "ese", "eso", "esos",
  "esta", "estaba", "estan", "estar", "estas", "este", "esto", "estos", "fue",
  "ha", "han", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas",
  "me", "mi", "mis", "mucho", "muy", "nada", "ni", "no", "nos", "o", "otra",
  "otras", "otro", "otros", "para", "pero", "poco", "por", "porque", "que",
  "quien", "quienes", "se", "ser", "si", "sin", "sobre", "son", "su", "sus",
  "tambien", "te", "tiene", "todo", "todos", "tu", "tus", "un", "una", "unas",
  "uno", "unos", "y", "ya", "yo",
  // English
  "about", "after", "again", "against", "all", "also", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being",
  "between", "both", "but", "by", "can", "could", "did", "do", "does",
  "doing", "done", "down", "each", "few", "for", "from", "further", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not",
  "now", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
  "ourselves", "out", "over", "own", "same", "she", "should", "so", "some",
  "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours", "yourself", "yourselves",
])

/** Lowercase, strip diacritics and collapse whitespace. */
export const normalizeMemoryText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

/** Letters/digits tokens of the normalized text, stopwords included. */
export const tokenizeMemoryText = (value: string): string[] =>
  normalizeMemoryText(value).match(/[\p{L}\p{N}]+/gu) ?? []

/** Unique content tokens of 3+ characters used by the lexical scorer. */
export const memoryKeywordTokens = (value: string): string[] => {
  const unique = new Set<string>()
  for (const token of tokenizeMemoryText(value)) {
    if (token.length < 3 || STOPWORDS.has(token)) continue
    unique.add(token)
  }
  return [...unique]
}

/** True when `phrase` appears as a contiguous exact token sequence. */
export const containsMemoryPhrase = (
  tokens: readonly string[],
  phrase: readonly string[],
): boolean => {
  if (phrase.length === 0 || phrase.length > tokens.length) return false
  const lastStart = tokens.length - phrase.length
  for (let start = 0; start <= lastStart; start += 1) {
    let matches = true
    for (let index = 0; index < phrase.length; index += 1) {
      if (tokens[start + index] !== phrase[index]) {
        matches = false
        break
      }
    }
    if (matches) return true
  }
  return false
}
