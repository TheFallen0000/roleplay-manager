import { useState } from "react"
import { toast } from "@workspace/ui/components/sonner"

import type {
  ConversationDetail,
  ConversationSettingsUpdate,
} from "@workspace/shared/types/conversation"

import { updateConversationSettings } from "@/lib/api/conversations"
import { ApiClientError } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"

export function useAppearanceUpdate(
  conversationId: string,
  onSettingsChanged: (updated: ConversationDetail) => void,
) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const updateAppearance = async (settings: ConversationSettingsUpdate) => {
    setSaving(true)
    try {
      const updated = await updateConversationSettings(conversationId, settings)
      onSettingsChanged(updated)
      toast.success(t("settings.appearanceUpdated"))
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? `[${error.code}] ${error.message}`
          : t("common.unknownError")
      toast.error(t("settings.appearanceUpdateFailed"), { description: message })
    } finally {
      setSaving(false)
    }
  }

  return { saving, updateAppearance }
}
