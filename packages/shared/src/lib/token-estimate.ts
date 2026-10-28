/**
 * Conservative token estimation for prompts. It is deliberately dependency
 * free: local models use different tokenizers, so an exact count is not
 * portable. `chars / 3` over-estimates Spanish and English prose, and the
 * safety margin leaves room for formatting overhead.
 */
const MESSAGE_OVERHEAD_TOKENS = 4
// `chars / 3` with a 10% safety margin, expressed as integer math so the
// ceiling does not drift (30 chars must be 11 tokens, not 12).
const TOKENS_PER_CHAR_NUMERATOR = 11
const TOKENS_PER_CHAR_DENOMINATOR = 30

const estimateTextTokensByLength = (length: number): number =>
  Math.ceil((length * TOKENS_PER_CHAR_NUMERATOR) / TOKENS_PER_CHAR_DENOMINATOR)

export const estimateTextTokens = (text: string): number =>
  estimateTextTokensByLength(text.length)

export const estimateMessagesTokens = (
  messages: readonly { content: string }[],
): number =>
  messages.reduce(
    (total, message) =>
      total + estimateTextTokens(message.content) + MESSAGE_OVERHEAD_TOKENS,
    0,
  )

export interface ContextTokenEstimate {
  systemTokens: number
  messageTokens: number
  inputTokens: number
  outputReserve: number
  totalTokens: number
  contextWindow: number | null
  contextPercent: number | null
}

export const estimateContextTokens = (params: {
  systemPrompt: string
  messages: readonly { content: string }[]
  outputReserve: number
  contextWindow: number | null | undefined
}): ContextTokenEstimate => {
  const systemTokens = estimateTextTokens(params.systemPrompt)
  const messageTokens = estimateMessagesTokens(params.messages)
  const inputTokens = systemTokens + messageTokens
  const outputReserve = Math.max(0, params.outputReserve)
  const totalTokens = inputTokens + outputReserve
  const contextWindow =
    params.contextWindow && params.contextWindow > 0
      ? params.contextWindow
      : null
  return {
    systemTokens,
    messageTokens,
    inputTokens,
    outputReserve,
    totalTokens,
    contextWindow,
    contextPercent: contextWindow
      ? Math.round((totalTokens / contextWindow) * 100)
      : null,
  }
}
