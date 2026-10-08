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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { toast } from "@workspace/ui/components/sonner"

import { copyTextToClipboard } from "@/lib/clipboard"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
import {
  extractTunnelServeUrl,
  translateApiError,
} from "@/lib/translate-api-error"
import { PhoneAccessSettings } from "./phone-access-settings"

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
  const lanStatus = useTunnelStore((state) => state.lanStatus)
  const refresh = useTunnelStore((state) => state.refresh)
  const enable = useTunnelStore((state) => state.enable)
  const disable = useTunnelStore((state) => state.disable)
  const refreshLan = useTunnelStore((state) => state.refreshLan)
  const enableLan = useTunnelStore((state) => state.enableLan)
  const disableLan = useTunnelStore((state) => state.disableLan)
  const refreshPreferences = useTunnelStore((state) => state.refreshPreferences)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentUrl, setConsentUrl] = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    refresh().catch(() => setError(t("tunnel.checkFailed")))
    refreshLan().catch(() => setError(t("tunnel.checkFailed")))
    refreshPreferences().catch(() => undefined)
  }, [open, refresh, refreshLan, refreshPreferences, t])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null)
      setConsentUrl(null)
    }
    onOpenChange(next)
  }

  const addresses = lanStatus?.addresses ?? []
  const address =
    selectedAddress && addresses.includes(selectedAddress)
      ? selectedAddress
      : (addresses[0] ?? null)
  const lanUrl =
    lanStatus?.active && address ? `http://${address}:${lanStatus.port}` : null

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

  const handleLanToggle = async (checked: boolean) => {
    setPending(true)
    setError(null)
    try {
      if (checked) {
        await enableLan()
      } else {
        await disableLan()
      }
    } catch (toggleError) {
      setError(translateApiError(toggleError, tRaw, t("tunnel.lanActionFailed")))
    } finally {
      setPending(false)
    }
  }

  const handleCopy = async (url: string | null) => {
    if (!url) return
    const copied = await copyTextToClipboard(url)
    if (copied) {
      toast.success(t("tunnel.copied"))
    } else {
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
      {/* The whole dialog scrolls on short viewports (small screens, or the
          Tailscale tab with the settings section expanded). */}
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tunnel.title")}</DialogTitle>
          <DialogDescription>{t("tunnel.description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="lan" className="min-w-0">
          <TabsList className="w-full">
            <TabsTrigger value="lan" className="flex-1">
              {t("tunnel.tabLan")}
            </TabsTrigger>
            <TabsTrigger value="tailscale" className="flex-1">
              {t("tunnel.tabTailscale")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lan" className="min-w-0 space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t("tunnel.lanToggleLabel")}</p>
                <p className="text-xs text-muted-foreground">
                  {lanStatus?.active
                    ? t("tunnel.lanStatusActive")
                    : t("tunnel.lanStatusInactive")}
                </p>
              </div>
              <Switch
                checked={lanStatus?.active ?? false}
                disabled={pending || !lanStatus}
                onCheckedChange={(checked) => void handleLanToggle(checked)}
                aria-label={t("tunnel.lanToggleLabel")}
              />
            </div>

            {lanStatus?.active ? (
              <div className="space-y-3">
                {addresses.length > 1 ? (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("tunnel.lanAddressLabel")}
                    </span>
                    <Select
                      value={address ?? ""}
                      onValueChange={(value) => {
                        if (value) setSelectedAddress(value)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {lanUrl ? (
                  <>
                    <div className="mx-auto w-fit rounded-xl bg-white p-3">
                      <QRCode value={lanUrl} size={168} />
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                        {lanUrl}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCopy(lanUrl)}
                      >
                        <CopyIcon />
                        {t("tunnel.copy")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("tunnel.lanScanHint")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("tunnel.lanSecurityNote")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("tunnel.lanFirewallHint")}
                    </p>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("tunnel.lanHint")}
              </p>
            )}

            <PhoneAccessSettings mode="lan" />
          </TabsContent>

          <TabsContent value="tailscale" className="min-w-0 space-y-4 pt-2">
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
                    onClick={() => void handleCopy(status.url)}
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

            <PhoneAccessSettings mode="tailscale" />
          </TabsContent>
        </Tabs>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
