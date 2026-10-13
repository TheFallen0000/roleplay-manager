import { useRef, useState } from "react"

import type { PlayerCharacterExport } from "@workspace/shared/types/export"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { FileJsonIcon, UploadIcon } from "lucide-react"

import { parsePlayerCharacterExport } from "@/lib/parse-player-character-export"
import { useTranslation } from "@/lib/hooks/use-translation"

export interface ImportPlayerCharacterResult {
  ok: boolean
  error?: string
}

interface ImportPlayerCharacterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (payload: PlayerCharacterExport) => Promise<ImportPlayerCharacterResult>
}

export function ImportPlayerCharacterDialog({
  open,
  onOpenChange,
  onImport,
}: ImportPlayerCharacterDialogProps) {
  const { t, locale } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null)
      setDragging(false)
      setImporting(false)
    }
    onOpenChange(next)
  }

  const handleFile = async (file: File) => {
    setError(null)
    const parsed = parsePlayerCharacterExport(await file.text(), locale)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    setImporting(true)
    try {
      const result = await onImport(parsed.payload)
      if (!result.ok) {
        setError(result.error ?? t("players.importFailed"))
        return
      }
      handleOpenChange(false)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("players.importTitle")}</DialogTitle>
          <DialogDescription>{t("players.importDescription")}</DialogDescription>
        </DialogHeader>

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
            if (file) {
              void handleFile(file)
            }
          }}
          disabled={importing}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:bg-muted/50",
          )}
        >
          {importing ? (
            <Spinner />
          ) : (
            <FileJsonIcon className="size-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {t("players.importDropHere")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("players.importChooseHint")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleFile(file)
            }
            event.target.value = ""
          }}
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            <UploadIcon className="size-4" />
            {t("players.importChooseFile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
