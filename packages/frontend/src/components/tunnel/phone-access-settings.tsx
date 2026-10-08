import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"

import {
  IDLE_DISABLE_MINUTES_OPTIONS,
  type IdleDisableMinutes,
  type PhoneAccessMode,
  type PhoneAccessPreferencesUpdateDTO,
} from "@workspace/shared/types/phone-access"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { useTranslation } from "@/lib/hooks/use-translation"
import { useTunnelStore } from "@/lib/stores/tunnel.store"

/** Idle timeout used when the watchdog is switched on. */
const DEFAULT_IDLE_MINUTES: IdleDisableMinutes = 60

/**
 * Sección «Ajustes del enlace», una por modo de acceso telefónico. Está plegada
 * por defecto y muestra un resumen de las opciones activas, para que el diálogo
 * principal siga siendo solo encender/apagar (los ajustes se editan al
 * expandirla, también con el enlace activo).
 */
export function PhoneAccessSettings({ mode }: { mode: PhoneAccessMode }) {
  const { t } = useTranslation()
  const preferences = useTunnelStore((state) => state.preferences)
  const updatePreferences = useTunnelStore((state) => state.updatePreferences)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = preferences?.[mode]
  if (!current) return null
  // The tunnel is the only mode whose state survives the app closing.
  const tunnelPreferences = "disableOnClose" in current ? current : null

  const summaryParts: string[] = []
  if (current.autoEnableOnStart) {
    summaryParts.push(t("tunnel.summaryAutoEnable"))
  }
  if (tunnelPreferences?.disableOnClose) {
    summaryParts.push(t("tunnel.summaryDisableOnClose"))
  }
  if (current.idleDisableMinutes !== null) {
    summaryParts.push(
      t("tunnel.summaryIdle", { minutes: current.idleDisableMinutes }),
    )
  }
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : t("tunnel.summaryNone")

  const apply = async (
    patch: Omit<PhoneAccessPreferencesUpdateDTO, "mode">,
  ) => {
    setSaving(true)
    setError(null)
    try {
      await updatePreferences({ mode, ...patch })
    } catch {
      setError(t("tunnel.settingsFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <span className="shrink-0 text-sm font-medium">
          {t("tunnel.settingsTitle")}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{summary}</span>
          <ChevronRightIcon
            className={cn(
              "size-4 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm">{t("tunnel.settingAutoEnable")}</p>
              <p className="text-xs text-muted-foreground">
                {t("tunnel.settingAutoEnableHint")}
              </p>
            </div>
            <Switch
              checked={current.autoEnableOnStart}
              disabled={saving}
              onCheckedChange={(checked) =>
                void apply({ autoEnableOnStart: checked })
              }
              aria-label={t("tunnel.settingAutoEnable")}
            />
          </div>

          {tunnelPreferences ? (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm">{t("tunnel.settingDisableOnClose")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("tunnel.settingDisableOnCloseHint")}
                </p>
              </div>
              <Switch
                checked={tunnelPreferences.disableOnClose}
                disabled={saving}
                onCheckedChange={(checked) =>
                  void apply({ disableOnClose: checked })
                }
                aria-label={t("tunnel.settingDisableOnClose")}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm">{t("tunnel.settingIdle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("tunnel.settingIdleHint")}
                </p>
              </div>
              <Switch
                checked={current.idleDisableMinutes !== null}
                disabled={saving}
                onCheckedChange={(checked) =>
                  void apply({
                    idleDisableMinutes: checked ? DEFAULT_IDLE_MINUTES : null,
                  })
                }
                aria-label={t("tunnel.settingIdle")}
              />
            </div>
            {current.idleDisableMinutes !== null ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  {t("tunnel.idleMinutesLabel")}
                </span>
                <Select
                  value={String(current.idleDisableMinutes)}
                  disabled={saving}
                  onValueChange={(value) => {
                    if (value) {
                      void apply({
                        idleDisableMinutes:
                          Number(value) as IdleDisableMinutes,
                      })
                    }
                  }}
                >
                  <SelectTrigger
                    className="w-28"
                    aria-label={t("tunnel.idleMinutesLabel")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IDLE_DISABLE_MINUTES_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {t("tunnel.idleMinutesOption", { minutes })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
