"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"
import { CropIcon, ImagePlusIcon, XIcon } from "lucide-react"
import {
  ALLOWED_IMAGE_MIMES,
  DEFAULT_MAX_PROFILE_IMAGE_BYTES,
  formatMegabytes,
} from "@workspace/shared/lib/image"
import {
  fetchCharacterAssetFile,
  getCharacterAssetUrl,
} from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"
import { ImageCropperDialog } from "./image-cropper-dialog"

interface ProfileImageInputProps {
  characterId: string
  name: string
  profileImageAssetId: string | null
  pendingFile: File | null
  /**
   * Asset offered for re-cropping. `undefined` hides the action; `null` also
   * hides it (there is nothing to crop).
   */
  recropAssetId?: string | null
  aspect?: number
  showClearButton?: boolean
  clearLabel?: string
  onFileSelected: (file: File) => void
  onClear: () => void
}

const MAX_SIZE_BYTES = DEFAULT_MAX_PROFILE_IMAGE_BYTES

type ValidationKey = "characters.imageInvalidType" | "characters.imageTooLarge"

function validateFile(file: File): ValidationKey | null {
  if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
    return "characters.imageInvalidType"
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "characters.imageTooLarge"
  }
  return null
}

export function ProfileImageInput({
  characterId,
  name,
  profileImageAssetId,
  pendingFile,
  recropAssetId,
  aspect = 1,
  showClearButton = true,
  clearLabel,
  onFileSelected,
  onClear,
}: ProfileImageInputProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [recropLoading, setRecropLoading] = useState(false)
  const clearLabelText = clearLabel ?? t("characters.removeImage")
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = useCallback(
    (file: File) => {
      const errorKey = validateFile(file)
      if (errorKey) {
        toast.error(t(errorKey, { max: formatMegabytes(MAX_SIZE_BYTES) }))
        return
      }
      setCropperFile(file)
    },
    [t],
  )

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleClear = useCallback(() => {
    onClear()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [onClear])

  const handleRecrop = useCallback(async () => {
    if (!recropAssetId) return
    setRecropLoading(true)
    try {
      const file = await fetchCharacterAssetFile(characterId, recropAssetId)
      if (file.type === "image/gif") {
        toast.error(t("characters.recropGif"))
        return
      }
      setCropperFile(file)
    } catch {
      toast.error(t("characters.recropFailed"))
    } finally {
      setRecropLoading(false)
    }
  }, [characterId, recropAssetId, t])

  const imageSrc =
    previewUrl ??
    (profileImageAssetId
      ? getCharacterAssetUrl(characterId, profileImageAssetId, "thumbnail")
      : null)
  const canRecrop = Boolean(recropAssetId && !pendingFile && imageSrc)

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
        }}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        {imageSrc ? (
          <Avatar className="size-24">
            <AvatarImage src={imageSrc} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <ImagePlusIcon className="size-10 text-muted-foreground" />
        )}
        <div className="text-sm">
          <p className="font-medium">{t("characters.imageDropHint")}</p>
          <p className="text-xs text-muted-foreground">
            {t("characters.imageFormats", {
              max: formatMegabytes(MAX_SIZE_BYTES),
            })}
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIMES.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
        className="hidden"
      />
      {pendingFile ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("characters.imagePending")}
        </p>
      ) : null}
      {imageSrc && (showClearButton || canRecrop) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {canRecrop ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleRecrop()}
              disabled={recropLoading}
            >
              {recropLoading ? <Spinner /> : <CropIcon className="size-3" />}
              {t("characters.recropImage")}
            </Button>
          ) : null}
          {showClearButton ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <XIcon className="size-3" />
              {clearLabelText}
            </Button>
          ) : null}
        </div>
      ) : null}

      <ImageCropperDialog
        open={!!cropperFile}
        onOpenChange={(open) => {
          if (!open) setCropperFile(null)
        }}
        file={cropperFile}
        aspect={aspect}
        onCropComplete={(croppedFile) => {
          onFileSelected(croppedFile)
          setCropperFile(null)
        }}
      />
    </div>
  )
}
