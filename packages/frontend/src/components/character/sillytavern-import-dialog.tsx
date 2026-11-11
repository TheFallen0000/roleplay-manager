import { useRef, useState } from "react"
import { FileJsonIcon, UploadIcon } from "lucide-react"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type {
  SillyTavernCardFormat,
  SillyTavernCardPreview,
  SillyTavernCardWarning,
} from "@workspace/shared/types/sillytavern-card"
import type { TranslationKey } from "@workspace/shared/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import {
  importSillyTavernCard,
  previewSillyTavernCard,
} from "@/lib/api/sillytavern-card"
import { ApiClientError } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47]

const WARNING_LABEL_KEYS: Record<SillyTavernCardWarning, TranslationKey> = {
  REGEX_IGNORED: "characters.sillytavern.warnings.REGEX_IGNORED",
  TIMED_EFFECTS_PRESERVED:
    "characters.sillytavern.warnings.TIMED_EFFECTS_PRESERVED",
  IMAGE_ABSENT: "characters.sillytavern.warnings.IMAGE_ABSENT",
  V1_CARD: "characters.sillytavern.warnings.V1_CARD",
  EMPTY_DESCRIPTION: "characters.sillytavern.warnings.EMPTY_DESCRIPTION",
  EMPTY_GREETING: "characters.sillytavern.warnings.EMPTY_GREETING",
  UNSUPPORTED_FIELDS_PRESERVED:
    "characters.sillytavern.warnings.UNSUPPORTED_FIELDS_PRESERVED",
  SCAN_DEPTH_PER_ENTRY_IGNORED:
    "characters.sillytavern.warnings.SCAN_DEPTH_PER_ENTRY_IGNORED",
}

const isPng = (bytes: Uint8Array): boolean =>
  bytes.length >= PNG_MAGIC_BYTES.length &&
  PNG_MAGIC_BYTES.every((byte, index) => bytes[index] === byte)

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

interface SillyTavernImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: (summary: CharacterSummary) => void
}

export function SillyTavernImportDialog({
  open,
  onOpenChange,
  onImported,
}: SillyTavernImportDialogProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [payload, setPayload] = useState<{
    format: SillyTavernCardFormat
    payload: string
  } | null>(null)
  const [preview, setPreview] = useState<SillyTavernCardPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPayload(null)
      setPreview(null)
      setLoading(false)
      setImporting(false)
      setError(null)
    }
    onOpenChange(next)
  }

  const describeError = (caught: unknown): string =>
    caught instanceof ApiClientError
      ? `[${caught.code}] ${caught.message}`
      : t("characters.sillytavern.importFailed")

  const handleFile = async (file: File) => {
    setError(null)
    setPreview(null)
    setPayload(null)
    setLoading(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const nextPayload = isPng(bytes)
        ? { format: "png" as const, payload: toBase64(bytes) }
        : { format: "json" as const, payload: new TextDecoder().decode(bytes) }

      const nextPreview = await previewSillyTavernCard(nextPayload)
      setPayload(nextPayload)
      setPreview(nextPreview)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!payload) return
    setError(null)
    setImporting(true)
    try {
      const summary = await importSillyTavernCard(payload)
      onImported?.(summary)
      handleOpenChange(false)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setImporting(false)
    }
  }

  const busy = loading || importing

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("characters.sillytavern.importTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.sillytavern.importDescription")}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
            "border-muted-foreground/25 hover:bg-muted/50",
          )}
        >
          {loading ? (
            <Spinner />
          ) : (
            <FileJsonIcon className="size-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {t("characters.sillytavern.importChooseFile")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("characters.sillytavern.importDropHint")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".json,.png,application/json,image/png"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleFile(file)
            }
            event.target.value = ""
          }}
        />

        {preview ? (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">
                {t("characters.sillytavern.previewName")}
              </dt>
              <dd className="font-medium">{preview.name}</dd>

              <dt className="text-muted-foreground">
                {t("characters.sillytavern.previewDescription")}
              </dt>
              <dd className="whitespace-pre-wrap break-words">
                {preview.description}
              </dd>

              {preview.creator ? (
                <>
                  <dt className="text-muted-foreground">
                    {t("characters.sillytavern.previewCreator")}
                  </dt>
                  <dd>{preview.creator}</dd>
                </>
              ) : null}

              <dt className="text-muted-foreground">
                {t("characters.sillytavern.previewLorebook")}
              </dt>
              <dd>{preview.lorebookEntryCount}</dd>

              <dt className="text-muted-foreground">
                {t("characters.sillytavern.previewCardVersion")}
              </dt>
              <dd>{preview.cardVersion}</dd>
            </dl>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t("characters.sillytavern.previewTags")}
              </span>
              {preview.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("characters.sillytavern.previewWarnings")}
              </span>
              {preview.warnings.length === 0 ? null : (
                <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{t(WARNING_LABEL_KEYS[warning])}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={busy || !payload}>
            {importing ? <Spinner /> : <UploadIcon className="size-4" />}
            {t("characters.sillytavern.importAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
