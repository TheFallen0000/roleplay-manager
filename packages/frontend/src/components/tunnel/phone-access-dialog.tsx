"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { CopyIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Switch } from "@workspace/ui/components/switch"
import { toast } from "@workspace/ui/components/sonner"

import { useTranslation } from "@/lib/hooks/use-translation"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
import {
  extractTunnelServeUrl,
  translateApiError,
} from "@/lib/translate-api-error"

export interface PhoneAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PhoneAccessDialog({
  open,
  onOpenChange,
}: PhoneAccessDialogProps) {
  const { t, tRaw } = useTranslation()
  const status = useTunnelStore((state) => state.status)
  const refresh = useTunnelStore((state) => state.refresh)
  const enable = useTunnelStore((state) => state.enable)
  const disable = useTunnelStore((state) => state.disable)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentUrl, setConsentUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    refresh().catch(() => setError(t("tunnel.checkFailed")))
  }, [open, refresh, t])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null)
      setConsentUrl(null)
    }
    onOpenChange(next)
  }

  const handleToggle = async (checked: boolean) => {
    setPending(true)
    setError(null)
    setConsentUrl(null)
    try {
      if (checked) {
        await enable()
      } else {
        await disable()
      }
    } catch (toggleError) {
      setError(translateApiError(toggleError, tRaw, t("tunnel.actionFailed")))
      setConsentUrl(extractTunnelServeUrl(toggleError))
    } finally {
      setPending(false)
    }
  }

  const handleCopy = async () => {
    if (!status?.url) return
    try {
      await navigator.clipboard.writeText(status.url)
      toast.success(t("tunnel.copied"))
    } catch {
      setError(t("tunnel.copyFailed"))
    }
  }

  const statusLabel = !status
    ? t("tunnel.loading")
    : !status.available
      ? t("tunnel.statusUnavailable")
      : !status.connected
        ? t("tunnel.statusDisconnected")
        : status.active
          ? t("tunnel.statusActive")
          : t("tunnel.statusInactive")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tunnel.title")}</DialogTitle>
          <DialogDescription>{t("tunnel.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("tunnel.toggleLabel")}</p>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
            <Switch
              checked={status?.active ?? false}
              disabled={pending || !status?.available || !status?.connected}
              onCheckedChange={(checked) => void handleToggle(checked)}
              aria-label={t("tunnel.toggleLabel")}
            />
          </div>

          {status && !status.available ? (
            <p className="text-sm text-muted-foreground">
              {t("tunnel.installGuide")}{" "}
              <a
                className="underline underline-offset-4"
                href="https://tailscale.com/download"
                target="_blank"
                rel="noreferrer"
              >
                {t("tunnel.installLink")}
              </a>
            </p>
          ) : null}

          {status && status.available && !status.connected ? (
            <p className="text-sm text-muted-foreground">
              {t("tunnel.signInGuide")}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {consentUrl ? (
            <p className="text-sm">
              <a
                className="font-medium underline underline-offset-4"
                href={consentUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("tunnel.enableServe")}
              </a>
            </p>
          ) : null}

          {status?.active && status.url ? (
            <div className="space-y-3">
              <div className="mx-auto w-fit rounded-xl bg-white p-3">
                <QRCode value={status.url} size={168} />
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                  {status.url}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy()}
                >
                  <CopyIcon />
                  {t("tunnel.copy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("tunnel.scanHint")}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
