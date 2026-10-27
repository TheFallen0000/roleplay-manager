"use client"

import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useTranslation } from "@/lib/hooks/use-translation"
import { useTunnelStore } from "@/lib/stores/tunnel.store"

const SEEN_STORAGE_KEY = "rm_phone_access_notice_seen"

const readSeen = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(SEEN_STORAGE_KEY)
  } catch {
    return null
  }
}

const markSeen = (at: string): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, at)
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

/**
 * One-time notice when the inactivity watchdog turns a phone link off.
 * The event lives in backend memory; the frontend remembers the last notice it
 * showed so navigating between pages does not repeat it.
 */
export function PhoneAccessNotice() {
  const { t } = useTranslation()
  const notice = useTunnelStore((state) => state.notice)
  const refreshNotice = useTunnelStore((state) => state.refreshNotice)
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    refreshNotice().catch(() => undefined)
  }, [refreshNotice])

  const seen = readSeen()
  const isNew =
    notice !== null &&
    notice.at !== dismissed &&
    (seen === null || Date.parse(notice.at) > Date.parse(seen))
  const modeLabel =
    notice?.mode === "tailscale" ? t("tunnel.tabTailscale") : t("tunnel.tabLan")

  const dismiss = () => {
    if (!notice) return
    setDismissed(notice.at)
    markSeen(notice.at)
  }

  return (
    <Dialog
      open={isNew}
      onOpenChange={(open) => {
        if (!open) dismiss()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("tunnel.inactivityTitle")}</DialogTitle>
          <DialogDescription>
            {t("tunnel.inactivityDescription", {
              mode: modeLabel,
              minutes: notice?.minutes ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={dismiss}>{t("tunnel.inactivityDismiss")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
