/**
 * Automatic context compaction: when the estimated prompt reaches the
 * threshold percentage of the model window, the oldest messages are
 * summarized until the context falls back to the target (threshold minus a
 * margin). The margin avoids summarizing on every single message.
 */
export const DEFAULT_COMPACTION_THRESHOLD = 80
export const MIN_COMPACTION_THRESHOLD = 50
export const MAX_COMPACTION_THRESHOLD = 95
export const COMPACTION_TARGET_MARGIN = 20
export const MIN_COMPACTION_TARGET = 30

export const clampCompactionThreshold = (value: number): number =>
  Math.min(
    MAX_COMPACTION_THRESHOLD,
    Math.max(MIN_COMPACTION_THRESHOLD, Math.round(value)),
  )

export const resolveCompactionTarget = (threshold: number): number =>
  Math.max(MIN_COMPACTION_TARGET, clampCompactionThreshold(threshold) - COMPACTION_TARGET_MARGIN)
