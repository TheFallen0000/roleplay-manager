import { useState } from "react"

import type {
  ConversationDetail,
  ConversationSettingsUpdate,
} from "@workspace/shared/types/conversation"
import type { ContextPolicyId } from "@workspace/shared/lib/context-policy"
import { DEFAULT_COMPACTION_THRESHOLD, clampCompactionThreshold } from "@workspace/shared/lib/compaction"
import {
  DEFAULT_CONTEXT_POLICY,
  normalizeContextPolicy,
} from "@workspace/shared/lib/context-policy"

interface HistoriaUpdate {
  settings: ConversationSettingsUpdate
  nextThreshold: number
}

/**
 * Local state and diffing for the "Historia" dialog. A policy change never
 * touches the threshold state, and each field is only sent when it differs
 * from the stored conversation.
 */
export function useHistoriaSettings(current: ConversationDetail) {
  const [compactionThreshold, setCompactionThreshold] = useState(
    current.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD,
  )
  const [contextPolicy, setContextPolicy] = useState<ContextPolicyId>(() =>
    normalizeContextPolicy(current.contextPolicy),
  )

  const savedThreshold =
    current.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD
  const savedPolicy = normalizeContextPolicy(current.contextPolicy)

  const isDefaults =
    compactionThreshold === DEFAULT_COMPACTION_THRESHOLD &&
    contextPolicy === DEFAULT_CONTEXT_POLICY

  const hasChanges =
    compactionThreshold !== savedThreshold || contextPolicy !== savedPolicy

  const reset = () => {
    setCompactionThreshold(DEFAULT_COMPACTION_THRESHOLD)
    setContextPolicy(DEFAULT_CONTEXT_POLICY)
  }

  const buildUpdate = (): HistoriaUpdate => {
    const nextThreshold = clampCompactionThreshold(compactionThreshold)
    const settings: ConversationSettingsUpdate = {}
    if (nextThreshold !== savedThreshold) {
      settings.compactionThreshold = nextThreshold
    }
    if (contextPolicy !== savedPolicy) {
      settings.contextPolicy = contextPolicy
    }
    return { settings, nextThreshold }
  }

  return {
    compactionThreshold,
    setCompactionThreshold,
    contextPolicy,
    setContextPolicy,
    isDefaults,
    hasChanges,
    reset,
    buildUpdate,
  }
}
