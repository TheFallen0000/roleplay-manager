"use client"

import { useEffect, useState } from "react"

import type { Locale } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useUpdatesStore } from "@/lib/stores/updates.store"

/**
 * One-time notice on the characters screen when an update is available.
 * Shown once per detected version (persisted in `localStorage`).
 */
export function UpdateNotice({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <UpdateNoticeContent />
    </I18nProvider>
  )
}

function UpdateNoticeContent() {
  const { t } = useTranslation()
  const status = useUpdatesStore((state) => state.status)
  const hydrateFromCache = useUpdatesStore((state) => state.hydrateFromCache)
  const shouldCheck = useUpdatesStore((state) => state.shouldCheck)
  const check = useUpdatesStore((state) => state.check)
  const wasNotified = useUpdatesStore((state) => state.wasNotified)
  const markNotified = useUpdatesStore((state) => state.markNotified)
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    hydrateFromCache()
  }, [hydrateFromCache])

  useEffect(() => {
    if (!shouldCheck()) return
    check().catch(() => undefined)
  }, [check, shouldCheck])

  const version = status?.latestVersion ?? null
  const open =
    status?.behind === true &&
    version !== null &&
    dismissed !== version &&
    !wasNotified(version)

  const dismiss = () => {
    if (version) {
      markNotified(version)
      setDismissed(version)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("updates.noticeTitle")}</DialogTitle>
          <DialogDescription>
            {t("updates.noticeDescription", { version: version ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={dismiss}>
            {t("updates.noticeDismiss")}
          </Button>
          <Button
            render={<a href="/settings/updates" />}
            onClick={dismiss}
          >
            {t("updates.noticeAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
