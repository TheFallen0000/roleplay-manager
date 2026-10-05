"use client"

import { useState } from "react"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldTitle, FieldContent } from "@workspace/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"
import type { ConversationDetail, MemoryDecayMode } from "@workspace/shared/types/conversation"

import { updateConversationSettings } from "@/lib/api/conversations"
import { ApiClientError } from "@/lib/api/client"
import { useMemoryStore } from "@/lib/stores/memory.store"
import { useTranslation } from "@/lib/hooks/use-translation"
import type { TranslationKey } from "@workspace/shared/i18n"

interface MemoryDecayCardProps {
  conversationId: string
  current: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
}

const MODE_LABEL_KEYS: Record<
  MemoryDecayMode,
  { title: TranslationKey; description: TranslationKey }
> = {
  silent: {
    title: "memory.decaySilent",
    description: "memory.decaySilentDescription",
  },
  manual: {
    title: "memory.decayManual",
    description: "memory.decayManualDescription",
  },
  off: {
    title: "memory.decayOff",
    description: "memory.decayOffDescription",
  },
}

export function MemoryDecayCard({
  conversationId,
  current,
  onSettingsChanged,
}: MemoryDecayCardProps) {
  const { t } = useTranslation()
  const runDecay = useMemoryStore((s) => s.runDecay)

  const [mode, setMode] = useState<MemoryDecayMode>(current.memoryDecayMode)
  const [threshold, setThreshold] = useState(current.memoryDecayThreshold)
  const [ageThreshold, setAgeThreshold] = useState(current.memoryDecayAgeThreshold)
  const [decaySpeed, setDecaySpeed] = useState(current.memoryDecaySpeed)
  const [saving, setSaving] = useState(false)
  const [decaying, setDecaying] = useState(false)

  const hasChanges =
    mode !== current.memoryDecayMode ||
    threshold !== current.memoryDecayThreshold ||
    ageThreshold !== current.memoryDecayAgeThreshold ||
    decaySpeed !== current.memoryDecaySpeed

  const handleSave = async () => {
    if (threshold < 1 || threshold > 10) {
      toast.error(t("memory.decayThresholdError"))
      return
    }
    if (ageThreshold < 1) {
      toast.error(t("memory.decayAgeError"))
      return
    }
    if (decaySpeed < 1) {
      toast.error(t("memory.decaySpeedError"))
      return
    }
    setSaving(true)
    try {
      const updated = await updateConversationSettings(conversationId, {
        memoryDecayMode: mode,
        memoryDecayThreshold: threshold,
        memoryDecayAgeThreshold: ageThreshold,
        memoryDecaySpeed: decaySpeed,
      })
      onSettingsChanged(updated)
      toast.success(t("memory.decaySaved"))
    } catch (e) {
      const message = e instanceof ApiClientError ? `[${e.code}] ${e.message}` : t("common.unknownError")
      toast.error(t("memory.decaySaveFailed"), { description: message })
    } finally {
      setSaving(false)
    }
  }

  const handleRunDecay = async () => {
    setDecaying(true)
    try {
      const result = await runDecay(conversationId)
      if (result.deleted > 0) {
        toast.success(t("memory.decayDone", { count: result.deleted }))
      } else {
        toast.info(t("memory.decayNone"))
      }
    } catch {
      toast.error(t("memory.decayFailed"))
    } finally {
      setDecaying(false)
    }
  }

  return (
    <FieldGroup>
      <FieldSet>
        <FieldDescription>
          {t("memory.decayIntro", { speed: decaySpeed, threshold })}
        </FieldDescription>
        <RadioGroup value={mode} onValueChange={(value) => setMode(value as MemoryDecayMode)}>
          {(Object.keys(MODE_LABEL_KEYS) as MemoryDecayMode[]).map((m) => (
            <FieldLabel key={m} htmlFor={`decay-${m}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{t(MODE_LABEL_KEYS[m].title)}</FieldTitle>
                  <FieldDescription>{t(MODE_LABEL_KEYS[m].description)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={m} id={`decay-${m}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      <div className="flex flex-col gap-3 p-1">
        <Field>
          <FieldLabel htmlFor="decay-threshold">{t("memory.decayThresholdLabel")}</FieldLabel>
          <Input
            id="decay-threshold"
            type="number"
            min={1}
            max={10}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="decay-age">{t("memory.decayAgeLabel")}</FieldLabel>
          <Input
            id="decay-age"
            type="number"
            min={1}
            value={ageThreshold}
            onChange={(e) => setAgeThreshold(Number(e.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="decay-speed">{t("memory.decaySpeedLabel")}</FieldLabel>
          <Input
            id="decay-speed"
            type="number"
            min={1}
            value={decaySpeed}
            onChange={(e) => setDecaySpeed(Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? <Spinner /> : null}
          {t("memory.decaySave")}
        </Button>
        <Button
          variant="outline"
          onClick={handleRunDecay}
          disabled={mode === "off" || decaying}
        >
          {decaying ? <Spinner /> : null}
          {t("memory.decayRun")}
        </Button>
      </div>
    </FieldGroup>
  )
}
