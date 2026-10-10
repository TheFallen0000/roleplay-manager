"use client"

import { useCallback, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"

import type { ConversationDetail } from "@workspace/shared/types/conversation"

import { uploadConversationCustomImage, ApiClientError } from "@/lib/api/client"
import { setConversationCustomProfileImage } from "@/lib/api/conversations"
import { useTranslation } from "@/lib/hooks/use-translation"
import { Separator } from "@workspace/ui/components/separator"
import { ProfileImageInput } from "@/components/shared/images/profile-image-input"
import { BackgroundImageInput } from "./background-image-input"
import { DialogueColorPicker } from "./dialogue-color-picker"
import { MessageStylePicker } from "./message-style-picker"

interface CustomizationTabProps {
  conversation: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
}

export function CustomizationTab({
  conversation,
  onSettingsChanged,
}: CustomizationTabProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const handleFileSelected = useCallback(
    async (file: File) => {
      setSaving(true)
      try {
        const { assetId } = await uploadConversationCustomImage(conversation.id, file)
        const updated = await setConversationCustomProfileImage(conversation.id, assetId)
        onSettingsChanged(updated)
        toast.success(t("settings.imageUpdated"))
      } catch (e) {
        toast.error(t("settings.imageUpdateFailed"), { description: errorMessage(e, t("common.unknownError")) })
      } finally {
        setSaving(false)
      }
    },
    [conversation.id, onSettingsChanged, t],
  )

  const handleClear = useCallback(async () => {
    setSaving(true)
    try {
      const updated = await setConversationCustomProfileImage(conversation.id, null)
      onSettingsChanged(updated)
      toast.success(t("settings.imageDeleted"))
    } catch (e) {
      toast.error(t("settings.imageDeleteFailed"), { description: errorMessage(e, t("common.unknownError")) })
    } finally {
      setSaving(false)
    }
  }, [conversation.id, onSettingsChanged, t])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">{t("settings.customImageTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.customImageDescription")}
        </p>
      </div>

      <ProfileImageInput
        characterId={conversation.characterId}
        name={conversation.characterName}
        profileImageAssetId={conversation.profileImageAssetId}
        pendingFile={null}
        showClearButton={!!conversation.customProfileImageAssetId}
        clearLabel={t("settings.clearCustomImage")}
        onFileSelected={handleFileSelected}
        onClear={handleClear}
      />

      <Separator />

      <BackgroundImageInput
        conversation={conversation}
        onSettingsChanged={onSettingsChanged}
      />

      <Separator />

      <div>
        <p className="text-sm font-medium">{t("settings.appearanceTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.appearanceDescription")}
        </p>
      </div>

      <MessageStylePicker
        conversationId={conversation.id}
        value={conversation.messageStyle}
        onSettingsChanged={onSettingsChanged}
      />

      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium">{t("settings.dialogueColors")}</p>
          <p className="text-xs text-muted-foreground">
            {t("settings.dialogueColorsHint")}
          </p>
        </div>
        <DialogueColorPicker
          conversationId={conversation.id}
          field="characterDialogueColor"
          label={t("settings.dialogueCharacter")}
          value={conversation.characterDialogueColor}
          onSettingsChanged={onSettingsChanged}
        />
        <DialogueColorPicker
          conversationId={conversation.id}
          field="userDialogueColor"
          label={t("settings.dialogueUser")}
          value={conversation.userDialogueColor}
          onSettingsChanged={onSettingsChanged}
        />
      </div>

      {saving ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner />
          <span>{t("settings.customImageSaving")}</span>
        </div>
      ) : null}
    </div>
  )
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiClientError ? `[${e.code}] ${e.message}` : fallback
}