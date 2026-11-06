export interface EffectiveWindow {
  /** Window used for budgets and percentages, or null when it is unknown. */
  window: number | null
  /** Tokens reserved for the reply; zero when the working window is net. */
  outputReserve: number
  /** True when the working window already excludes the reply reserve. */
  net: boolean
}

/**
 * Resolves the window a consumer must budget against. A positive working
 * window that fits inside the raw model window is already net of the reply
 * reserve, so it is used as-is. Anything else falls back to the raw window
 * plus the requested reply reserve, which keeps legacy rows unchanged.
 */
export const resolveEffectiveWindow = (params: {
  contextWindow: number | null
  workingWindow: number | null | undefined
  maxTokens: number | null | undefined
}): EffectiveWindow => {
  const { contextWindow, workingWindow, maxTokens } = params

  if (
    workingWindow != null &&
    Number.isFinite(workingWindow) &&
    workingWindow > 0 &&
    contextWindow != null &&
    Number.isFinite(contextWindow) &&
    workingWindow <= contextWindow
  ) {
    return { window: workingWindow, outputReserve: 0, net: true }
  }

  return {
    window:
      contextWindow != null && Number.isFinite(contextWindow) && contextWindow > 0
        ? contextWindow
        : null,
    outputReserve: maxTokens ?? 2_048,
    net: false,
  }
}
