import { useEffect, useRef, useState } from "react"
import { FileJsonIcon, UploadIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type {
  ImportLorebookAction,
  ImportLorebookPreview,
} from "@workspace/shared/types/lorebook"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

import { ApiClientError } from "@/lib/api/client"
import {
  importLorebook,
  importLorebookPreview,
  type LorebookExportFormat,
} from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookRestoreDialog } from "./lorebook-restore-dialog"

interface LorebookImportDialogProps {
  open: boolean
  format: LorebookExportFormat
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}

export function LorebookImportDialog({
  open,
  format,
  onOpenChange,
  onImported,
}: LorebookImportDialogProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFormat, setSelectedFormat] =
    useState<LorebookExportFormat>(format)
  const [payload, setPayload] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportLorebookPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPayload(null)
      setPreview(null)
      setLoading(false)
      setImporting(false)
      setError(null)
    }
  }, [open])

  const describeError = (caught: unknown): string =>
    caught instanceof ApiClientError
      ? `[${caught.code}] ${caught.message}`
      : t("lorebooks.loadFailed")

  const runPreview = async (nextFormat: LorebookExportFormat, nextPayload: string) => {
    setError(null)
    setPreview(null)
    setLoading(true)
    try {
      setPreview(
        await importLorebookPreview({
          format: nextFormat,
          payload: nextPayload,
        }),
      )
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    setPayload(text)
    await runPreview(selectedFormat, text)
  }

  const handleFormatChange = (nextFormat: LorebookExportFormat) => {
    setSelectedFormat(nextFormat)
    if (payload) {
      void runPreview(nextFormat, payload)
    }
  }

  const handleConfirm = async (action: ImportLorebookAction) => {
    if (!payload) return
    setError(null)
    setImporting(true)
    try {
      const result = await importLorebook({
        format: selectedFormat,
        payload,
        action,
      })
      toast.success(
        `${t("lorebooks.import")} · ${result.lorebook.name ?? ""}`.trim(),
      )
      onImported?.()
      onOpenChange(false)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setImporting(false)
    }
  }

  if (preview?.matched) {
    return (
      <LorebookRestoreDialog
        open={open}
        preview={preview}
        onOpenChange={(next) => {
          if (!next) setPreview(null)
        }}
        onConfirm={(action) => {
          void handleConfirm(action)
        }}
      />
    )
  }

  const busy = loading || importing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("lorebooks.import")}</DialogTitle>
          <DialogDescription>{t("lorebooks.importPreview")}</DialogDescription>
        </DialogHeader>

        <div className="rm-field">
          <Label htmlFor="lorebook-import-format">
            {t("lorebooks.importFormat")}
          </Label>
          <select
            id="lorebook-import-format"
            value={selectedFormat}
            onChange={(event) =>
              handleFormatChange(event.target.value as LorebookExportFormat)
            }
            disabled={busy}
          >
            <option value="ccv3">{t("lorebooks.formatCcv3")}</option>
            <option value="st-native">{t("lorebooks.formatStNative")}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/50"
        >
          {loading ? <Spinner /> : <FileJsonIcon className="size-8 text-muted-foreground" />}
          <span className="text-sm font-medium">
            {t("characters.importChooseFile")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleFile(file)
            }
            event.target.value = ""
          }}
        />

        {preview && !preview.matched ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
            <p>{t("lorebooks.createNewBook")}</p>
            <Button
              onClick={() => {
                void handleConfirm("new-book")
              }}
              disabled={importing}
            >
              {importing ? <Spinner /> : <UploadIcon className="size-4" />}
              {t("lorebooks.createNewBook")}
            </Button>
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
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
