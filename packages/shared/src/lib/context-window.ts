export interface EffectiveWindow {
  /** Window used for budgets and percentages, or null when it is unknown. */
  window: number | null
  /** Tokens reserved for the reply; zero when the working window is net. */
  outputReserve: number
  /** True when the working window already excludes the reply reserve. */
  net: boolean
}

export interface WorkingWindowParams {
  contextWindow: number | null
  workingWindow: number | null | undefined
  maxTokens: number | null | undefined
}

const DEFAULT_REPLY_RESERVE = 2_048

/**
 * A working window is safe when it is positive, fits inside the raw window and
 * still leaves room for the requested reply. The boundary is inclusive: the
 * resolver accepts `workingWindow + maxTokens === contextWindow` as net, and
 * the settings cleanup must use the same comparator instead of clearing it.
 */
export const isSafeWorkingWindow = (
  params: WorkingWindowParams,
): params is WorkingWindowParams & {
  contextWindow: number
  workingWindow: number
} => {
  const { contextWindow, workingWindow, maxTokens } = params
  const replyReserve = maxTokens ?? DEFAULT_REPLY_RESERVE

  return (
    workingWindow != null &&
    Number.isFinite(workingWindow) &&
    workingWindow > 0 &&
    contextWindow != null &&
    Number.isFinite(contextWindow) &&
    contextWindow > 0 &&
    workingWindow <= contextWindow &&
    workingWindow + replyReserve <= contextWindow
  )
}

/**
 * Resolves the window a consumer must budget against. A positive working
 * window that fits inside the raw model window and still leaves room for the
 * requested reply is already net of the reply reserve, so it is used as-is.
 * Anything else falls back to the raw window plus the requested reply reserve,
 * which keeps legacy rows and unsafe hand-edited values conservative.
 */
export const resolveEffectiveWindow = (
  params: WorkingWindowParams,
): EffectiveWindow => {
  if (isSafeWorkingWindow(params)) {
    return { window: params.workingWindow, outputReserve: 0, net: true }
  }

  const { contextWindow, maxTokens } = params
  return {
    window:
      contextWindow != null && Number.isFinite(contextWindow) && contextWindow > 0
        ? contextWindow
        : null,
    outputReserve: maxTokens ?? DEFAULT_REPLY_RESERVE,
    net: false,
  }
}
