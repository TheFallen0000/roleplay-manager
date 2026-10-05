import { useState } from "react"
import { toast } from "@workspace/ui/components/sonner"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type { ExportSection } from "@workspace/shared/types/export"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Spinner } from "@workspace/ui/components/spinner"
import { DownloadIcon } from "lucide-react"

import { exportCharacter } from "@/lib/api/characters"
import { useTranslation } from "@/lib/hooks/use-translation"
import type { TranslationKey } from "@workspace/shared/i18n"

const CONVERSATION_CHILDREN: ExportSection[] = [
  "conversations.messages",
  "conversations.memories",
  "conversations.summaries",
  "conversations.settings",
]

const DEFAULT_SECTIONS: ExportSection[] = [
  "definition",
  "profileImage",
  "versions",
  "conversations",
  ...CONVERSATION_CHILDREN,
]

const ALL_SECTIONS: ExportSection[] = [...DEFAULT_SECTIONS, "standaloneSettings"]

const CHILD_LABEL_KEYS: Record<string, TranslationKey> = {
  "conversations.messages": "characters.exportMessages",
  "conversations.memories": "characters.exportMemories",
  "conversations.summaries": "characters.exportSummaries",
  "conversations.settings": "characters.exportSettings",
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

interface ExportDialogProps {
  character: CharacterSummary | null
  conversationCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({
  character,
  conversationCount,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<ExportSection>>(
    () => new Set(DEFAULT_SECTIONS),
  )
  const [exporting, setExporting] = useState(false)

  const conversationsSelected = selected.has("conversations")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(new Set(DEFAULT_SECTIONS))
    }
    onOpenChange(next)
  }

  const setSectionChecked = (section: ExportSection, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(section)
      } else {
        next.delete(section)
      }
      if (section === "conversations") {
        for (const child of CONVERSATION_CHILDREN) {
          if (checked) {
            next.add(child)
          } else {
            next.delete(child)
          }
        }
      }
      return next
    })
  }

  const handleExport = async () => {
    if (!character) return
    if (selected.size === 0) {
      toast.error(t("characters.exportSelectSection"))
      return
    }

    setExporting(true)
    try {
      const data = await exportCharacter(character.id, Array.from(selected))
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${t("characters.slugFallback")}-${slugify(
        character.name,
        t("characters.slugFallback"),
      )}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(t("characters.exportDone"))
      handleOpenChange(false)
    } catch {
      toast.error(t("characters.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("characters.exportTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.exportDescription", { name: character?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("characters.exportSections")}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set(ALL_SECTIONS))}
            >
              {t("characters.exportSelectAll")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              {t("characters.exportClearAll")}
            </Button>
          </div>
        </div>

        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          <label className="flex items-center gap-2 opacity-60">
            <Checkbox checked disabled />
            <span className="text-sm font-semibold">
              {character?.name ?? t("characters.fallbackName")}
            </span>
          </label>

          <div className="flex flex-col gap-3 border-l pl-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={selected.has("definition")}
                onCheckedChange={(checked) =>
                  setSectionChecked("definition", checked)
                }
              />
              <span className="text-sm">
                {t("characters.exportDefinition")}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={selected.has("profileImage")}
                onCheckedChange={(checked) =>
                  setSectionChecked("profileImage", checked)
                }
              />
              <span className="text-sm">{t("characters.exportProfileImage")}</span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={selected.has("versions")}
                onCheckedChange={(checked) =>
                  setSectionChecked("versions", checked)
                }
              />
              <span className="text-sm">
                {t("characters.exportVersions")}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={conversationsSelected}
                onCheckedChange={(checked) =>
                  setSectionChecked("conversations", checked)
                }
              />
              <span className="text-sm">
                {t("characters.exportConversations")}
                <span className="text-muted-foreground">
                  {" "}
                  ({conversationCount})
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-3 border-l pl-4">
              {CONVERSATION_CHILDREN.map((child) => (
                <label
                  key={child}
                  className={
                    conversationsSelected
                      ? "flex items-center gap-2"
                      : "flex items-center gap-2 opacity-50"
                  }
                >
                  <Checkbox
                    checked={selected.has(child)}
                    disabled={!conversationsSelected}
                    onCheckedChange={(checked) =>
                      setSectionChecked(child, checked)
                    }
                  />
                  <span className="text-sm">
                    {t(CHILD_LABEL_KEYS[child])}
                  </span>
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={selected.has("standaloneSettings")}
                onCheckedChange={(checked) =>
                  setSectionChecked("standaloneSettings", checked)
                }
              />
              <span className="text-sm">
                {t("characters.exportStandaloneSettings")}
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={exporting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Spinner /> : <DownloadIcon className="size-4" />}
            {t("characters.exportAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
