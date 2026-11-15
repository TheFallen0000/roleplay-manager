import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

import { getCharacterCard } from "@/lib/api/sillytavern-card"
import { copyTextToClipboard } from "@/lib/clipboard"
import { useTranslation } from "@/lib/hooks/use-translation"

interface CardInspectorDialogProps {
  characterId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CardInspectorDialog({
  characterId,
  open,
  onOpenChange,
}: CardInspectorDialogProps) {
  const { t } = useTranslation()
  const [spec, setSpec] = useState<"v2" | "v3">("v3")
  const [json, setJson] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const loading = open && json === null

  useEffect(() => {
    if (!open) return
    let active = true
    getCharacterCard(characterId, { spec })
      .then((card) => {
        if (active) setJson(JSON.stringify(card, null, 2))
      })
      .catch(() => {
        if (active) {
          setJson("")
          toast.error(t("characters.cardInspectFailed"))
        }
      })
    return () => {
      active = false
    }
  }, [characterId, open, spec, t])

  const changeSpec = (next: "v2" | "v3") => {
    setSpec(next)
    setJson(null)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setJson(null)
      setCopied(false)
    }
    onOpenChange(next)
  }

  const copy = async () => {
    if (!json) return
    const copied = await copyTextToClipboard(json)
    if (copied) {
      setCopied(true)
      toast.success(t("characters.cardCopied"))
      window.setTimeout(() => setCopied(false), 1600)
    } else {
      toast.error(t("characters.cardCopyFailed"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("characters.cardInspectTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.cardInspectDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rm-filter">
            {(["v3", "v2"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={spec === value}
                onClick={() => changeSpec(value)}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copy()}
            disabled={!json || loading}
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            {copied ? t("characters.cardCopied") : t("characters.cardCopy")}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : json ? (
          <pre className="rm-code">{json}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("characters.cardInspectEmpty")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
