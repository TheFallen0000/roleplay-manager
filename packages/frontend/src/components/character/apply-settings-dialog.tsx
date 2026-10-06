"use client"

import { useRef, useState } from "react"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type {
  ExportSettings,
  SettingsTemplateWarning,
} from "@workspace/shared/types/export"
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
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { FileJsonIcon, Settings2Icon } from "lucide-react"

import { applySettingsTemplate } from "@/lib/api/characters"
import { ApiClientError } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"
import { parseSettingsTemplate } from "@/lib/parse-settings-template"

const WARNING_KEYS: Record<SettingsTemplateWarning, TranslationKey> = {
  PROVIDER_INSTANCE_NOT_FOUND: "characters.settingsProviderSkipped",
  PROVIDER_UNSUPPORTED: "characters.settingsProviderUnsupported",
  NO_CONVERSATIONS: "characters.settingsNoConversations",
}

const DECAY_MODE_KEYS = {
  silent: "memory.decaySilent",
  manual: "memory.decayManual",
  off: "memory.decayOff",
} as const

interface ApplySettingsDialogProps {
  character: CharacterSummary
  conversationCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplySettingsDialog({
  character,
  conversationCount,
  open,
  onOpenChange,
}: ApplySettingsDialogProps) {
  const { t, locale } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<Partial<ExportSettings> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [applying, setApplying] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSettings(null)
      setError(null)
      setDragging(false)
      setApplying(false)
    }
    onOpenChange(next)
  }

  const handleFile = async (file: File) => {
    setError(null)
    const parsed = parseSettingsTemplate(await file.text(), locale)
    if (!parsed.ok) {
      setSettings(null)
      setError(parsed.error)
      return
    }
    setSettings(parsed.settings)
  }

  const handleApply = async () => {
    if (!settings) return
    setApplying(true)
    try {
      const result = await applySettingsTemplate(character.id, settings)
      toast.success(
        t("characters.settingsApplied", { count: result.applied }),
      )
      for (const warning of result.warnings) {
        toast.warning(t(WARNING_KEYS[warning]))
      }
      handleOpenChange(false)
    } catch (e) {
      const description =
        e instanceof ApiClientError
          ? `[${e.code}] ${e.message}`
          : t("common.unknownError")
      toast.error(t("characters.settingsFailed"), { description })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("characters.settingsTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.settingsDescription", {
              name: character.name,
              count: conversationCount,
            })}
          </DialogDescription>
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
            if (file) void handleFile(file)
          }}
          disabled={applying}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:bg-muted/50",
          )}
        >
          <FileJsonIcon className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("characters.settingsDropHere")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("characters.settingsChooseHint")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ""
          }}
        />

        {settings ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              {t("characters.settingsSummary")}
            </span>
            <div className="flex flex-wrap gap-2">
              {settings.model ? (
                <Badge variant="secondary">{settings.model}</Badge>
              ) : null}
              {settings.provider ? (
                <Badge variant="secondary">{settings.provider}</Badge>
              ) : null}
              {settings.temperature !== undefined ? (
                <Badge variant="outline">
                  {t("settings.temperature", {
                    value: settings.temperature.toFixed(1),
                  })}
                </Badge>
              ) : null}
              {settings.maxTokens !== undefined ? (
                <Badge variant="outline">
                  {t("settings.maxTokens")}: {settings.maxTokens}
                </Badge>
              ) : null}
              {settings.recentMessageCount !== undefined ? (
                <Badge variant="outline">
                  {t("settings.recentMessages")}: {settings.recentMessageCount}
                </Badge>
              ) : null}
              {settings.memoryDecayMode ? (
                <Badge variant="outline">
                  {t(DECAY_MODE_KEYS[settings.memoryDecayMode])}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {conversationCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("characters.settingsNoConversations")}
          </p>
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
            disabled={applying}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!settings || applying || conversationCount === 0}
          >
            {applying ? <Spinner /> : <Settings2Icon className="size-4" />}
            {t("characters.settingsApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
