"use client"

import { useCallback, useRef, useState } from "react"

import type {
  BackgroundFit,
  ConversationDetail,
} from "@workspace/shared/types/conversation"
import {
  ALLOWED_IMAGE_MIMES,
  DEFAULT_MAX_PROFILE_IMAGE_BYTES,
  formatMegabytes,
} from "@workspace/shared/lib/image"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { ImagePlusIcon } from "lucide-react"

import {
  ApiClientError,
  getCharacterAssetUrl,
  uploadConversationBackground,
} from "@/lib/api/client"
import { updateConversationSettings } from "@/lib/api/conversations"
import { useTranslation } from "@/lib/hooks/use-translation"
import { ImageCropperDialog } from "@/components/shared/images/image-cropper-dialog"

const MAX_SIZE_BYTES = DEFAULT_MAX_PROFILE_IMAGE_BYTES

interface BackgroundImageInputProps {
  conversation: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
}

export function BackgroundImageInput({
  conversation,
  onSettingsChanged,
}: BackgroundImageInputProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scrim, setScrim] = useState(conversation.backgroundScrim ?? 0)

  const backgroundId = conversation.backgroundImageAssetId
  const fit: BackgroundFit = conversation.backgroundFit ?? "cover"

  const errorMessage = useCallback(
    (error: unknown) =>
      error instanceof ApiClientError
        ? `[${error.code}] ${error.message}`
        : t("common.unknownError"),
    [t],
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        toast.error(t("characters.imageInvalidType"))
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(
          t("characters.imageTooLarge", {
            max: formatMegabytes(MAX_SIZE_BYTES),
          }),
        )
        return
      }
      setCropperFile(file)
    },
    [t],
  )

  const persist = useCallback(
    async (
      settings: Parameters<typeof updateConversationSettings>[1],
      successMessage: string,
      failureMessage: string,
    ) => {
      setSaving(true)
      try {
        const updated = await updateConversationSettings(
          conversation.id,
          settings,
        )
        onSettingsChanged(updated)
        toast.success(successMessage)
      } catch (error) {
        toast.error(failureMessage, { description: errorMessage(error) })
      } finally {
        setSaving(false)
      }
    },
    [conversation.id, onSettingsChanged, errorMessage],
  )

  const handleCropComplete = async (file: File) => {
    setSaving(true)
    try {
      const { assetId } = await uploadConversationBackground(
        conversation.id,
        file,
      )
      const updated = await updateConversationSettings(conversation.id, {
        backgroundImageAssetId: assetId,
      })
      onSettingsChanged(updated)
      toast.success(t("settings.backgroundUpdated"))
    } catch (error) {
      toast.error(t("settings.backgroundUpdateFailed"), {
        description: errorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFitChange = (value: BackgroundFit) =>
    persist(
      { backgroundFit: value },
      t("settings.backgroundUpdated"),
      t("settings.backgroundUpdateFailed"),
    )

  const handleScrimChange = (value: number | readonly number[]) => {
    setScrim(Array.isArray(value) ? value[0] : value)
  }

  const handleScrimCommit = (value: number | readonly number[]) => {
    const next = Array.isArray(value) ? value[0] : value
    setScrim(next)
    void persist(
      { backgroundScrim: next },
      t("settings.backgroundUpdated"),
      t("settings.backgroundUpdateFailed"),
    )
  }

  const handleClear = () =>
    persist(
      { backgroundImageAssetId: null },
      t("settings.backgroundDeleted"),
      t("settings.backgroundDeleteFailed"),
    )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">{t("settings.backgroundTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.backgroundDescription")}
        </p>
      </div>

      {backgroundId ? (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            <img
              src={getCharacterAssetUrl(
                conversation.characterId,
                backgroundId,
                "medium",
              )}
              alt=""
              aria-hidden
              className={cn(
                "size-full",
                fit === "contain" ? "object-contain" : "object-cover",
              )}
            />
            {scrim > 0 ? (
              <div
                aria-hidden
                className="absolute inset-0 bg-background"
                style={{ opacity: scrim / 100 }}
              />
            ) : null}
            <div
              aria-hidden
              className="absolute inset-0 flex flex-col justify-center gap-1.5 p-4"
            >
              <div className="ml-auto h-4 w-2/5 rounded-full bg-primary/90" />
              <div className="h-4 w-1/2 rounded-full bg-muted/90" />
              <div className="ml-auto h-4 w-1/3 rounded-full bg-primary/90" />
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="background-fit">
              {t("settings.backgroundFit")}
            </FieldLabel>
            <Select
              value={fit}
              onValueChange={(value) => {
                if (value) void handleFitChange(value as BackgroundFit)
              }}
            >
              <SelectTrigger id="background-fit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">
                  {t("settings.backgroundFitCover")}
                </SelectItem>
                <SelectItem value="contain">
                  {t("settings.backgroundFitContain")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="background-scrim">
              {t("settings.backgroundScrim")} ({scrim}%)
            </FieldLabel>
            <Slider
              id="background-scrim"
              value={[scrim]}
              min={0}
              max={100}
              step={5}
              onValueChange={handleScrimChange}
              onValueCommitted={handleScrimCommit}
              disabled={saving}
            />
            <FieldDescription>
              {t("settings.backgroundScrimHint")}
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={saving}
            >
              <ImagePlusIcon className="size-3" />
              {t("settings.backgroundChange")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleClear()}
              disabled={saving}
            >
              {t("settings.backgroundRemove")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          disabled={saving}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
          )}
        >
          <ImagePlusIcon className="size-10 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("settings.backgroundAdd")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("characters.imageDropHint")} ·{" "}
            {t("characters.imageFormats", {
              max: formatMegabytes(MAX_SIZE_BYTES),
            })}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIMES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ""
        }}
      />

      {saving ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner />
          <span>{t("settings.backgroundSaving")}</span>
        </div>
      ) : null}

      <ImageCropperDialog
        open={!!cropperFile}
        onOpenChange={(open) => {
          if (!open) setCropperFile(null)
        }}
        file={cropperFile}
        aspect={16 / 9}
        onCropComplete={(croppedFile) => {
          void handleCropComplete(croppedFile)
          setCropperFile(null)
        }}
      />
    </div>
  )
}
