import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type {
  SillyTavernCardExportSpec,
  SillyTavernCardFormat,
} from "@workspace/shared/types/sillytavern-card"
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

import { exportSillyTavernCard } from "@/lib/api/sillytavern-card"
import { useTranslation } from "@/lib/hooks/use-translation"

interface SillyTavernExportDialogProps {
  character: CharacterSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}

const slugify = (value: string, fallback: string): string => {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

const toggleClass = (selected: boolean): string =>
  cn(selected ? "" : "opacity-60")

export function SillyTavernExportDialog({
  character,
  open,
  onOpenChange,
}: SillyTavernExportDialogProps) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<SillyTavernCardFormat>("png")
  const [spec, setSpec] = useState<SillyTavernCardExportSpec>("v3")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportSillyTavernCard(character.id, {
        format,
        spec,
      })
      const url = URL.createObjectURL(result.body)
      const link = document.createElement("a")
      link.href = url
      link.download = `${slugify(
        character.name,
        t("characters.slugFallback"),
      )}.${result.format === "png" ? "png" : "json"}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(t("characters.sillytavern.exportDone"))
      onOpenChange(false)
    } catch {
      toast.error(t("characters.sillytavern.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("characters.sillytavern.exportTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.sillytavern.exportDescription", {
              name: character.name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t("characters.sillytavern.exportFormat")}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={format === "png" ? "default" : "outline"}
                aria-pressed={format === "png"}
                className={toggleClass(format === "png")}
                onClick={() => setFormat("png")}
                disabled={exporting}
              >
                {t("characters.sillytavern.formatPng")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === "json" ? "default" : "outline"}
                aria-pressed={format === "json"}
                className={toggleClass(format === "json")}
                onClick={() => setFormat("json")}
                disabled={exporting}
              >
                {t("characters.sillytavern.formatJson")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t("characters.sillytavern.exportSpec")}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={spec === "v3" ? "default" : "outline"}
                aria-pressed={spec === "v3"}
                className={toggleClass(spec === "v3")}
                onClick={() => setSpec("v3")}
                disabled={exporting}
              >
                {t("characters.sillytavern.specV3")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={spec === "v2" ? "default" : "outline"}
                aria-pressed={spec === "v2"}
                className={toggleClass(spec === "v2")}
                onClick={() => setSpec("v2")}
                disabled={exporting}
              >
                {t("characters.sillytavern.specV2")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Spinner /> : <DownloadIcon className="size-4" />}
            {t("characters.sillytavern.exportAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
