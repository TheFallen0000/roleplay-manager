"use client"

import { useEffect, useState } from "react"

import type { Locale } from "@workspace/shared/i18n"
import type { BackupResultDTO } from "@workspace/shared/types/update"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
import { getHealth } from "@/lib/api/health"
import {
  clearCachedStatus,
  clearRestartMarker,
  readRestartMarker,
  useUpdatesStore,
  writeRestartMarker,
} from "@/lib/stores/updates.store"
import { translateApiError } from "@/lib/translate-api-error"

import { UpdatesApplyCard } from "./updates-apply-card"
import { UpdatesJobCard } from "./updates-job-card"
import { UpdatesRestartCard } from "./updates-restart-card"
import {
  UpdatesSuccessCard,
  type AppliedUpdate,
} from "./updates-success-card"
import { UpdatesVersionCard } from "./updates-version-card"

/** Waits until the app answers again (it restarts after applying an update). */
const RECONNECT_ATTEMPTS = 120
const RECONNECT_INTERVAL_MS = 1000

const waitForApp = async (): Promise<boolean> => {
  for (let attempt = 0; attempt < RECONNECT_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_INTERVAL_MS))
    try {
      await getHealth()
      window.location.reload()
      return true
    } catch {
      // Still restarting.
    }
  }
  return false
}

export function UpdatesPanel({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <UpdatesPanelContent />
    </I18nProvider>
  )
}

function UpdatesPanelContent() {
  const { t, tRaw } = useTranslation()
  const status = useUpdatesStore((state) => state.status)
  const checking = useUpdatesStore((state) => state.checking)
  const hydrateFromCache = useUpdatesStore((state) => state.hydrateFromCache)
  const shouldCheck = useUpdatesStore((state) => state.shouldCheck)
  const check = useUpdatesStore((state) => state.check)
  const refresh = useUpdatesStore((state) => state.refresh)
  const apply = useUpdatesStore((state) => state.apply)
  const rollback = useUpdatesStore((state) => state.rollback)
  const createBackup = useUpdatesStore((state) => state.createBackup)
  const restart = useUpdatesStore((state) => state.restart)

  const [withBackup, setWithBackup] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<BackupResultDTO | null>(null)
  const [busy, setBusy] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [restartError, setRestartError] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedUpdate | null>(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [rolledBack, setRolledBack] = useState<string | null>(null)

  useEffect(() => {
    hydrateFromCache()
  }, [hydrateFromCache])

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      try {
        const fresh = await refresh()
        if (cancelled) return
        const marker = readRestartMarker()
        if (
          marker &&
          fresh.currentVersion === marker.to &&
          !fresh.restartRequired
        ) {
          setApplied({ version: marker.to, kind: marker.kind })
          clearRestartMarker()
        } else if (
          marker &&
          !fresh.restartRequired &&
          fresh.installedVersion !== marker.to
        ) {
          clearRestartMarker()
        }
        if (shouldCheck()) {
          await check()
        }
      } catch (syncError) {
        if (!cancelled) {
          setError(
            translateApiError(syncError, tRaw, t("updates.checkFailed")),
          )
        }
      }
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [check, refresh, shouldCheck, t, tRaw])

  useEffect(() => {
    if (!status?.restartRequired) return
    writeRestartMarker({
      from: status.currentVersion,
      to: status.installedVersion,
      kind: status.behind ? "rollback" : "update",
    })
  }, [
    status?.restartRequired,
    status?.currentVersion,
    status?.installedVersion,
    status?.behind,
  ])

  const job = status?.job ?? null
  const applying = job?.running ?? false

  useEffect(() => {
    if (!applying) return
    const timer = setInterval(() => {
      refresh().catch(() => undefined)
    }, 1500)
    return () => clearInterval(timer)
  }, [applying, refresh])

  const runCheck = async () => {
    setBusy(true)
    setError(null)
    try {
      await check()
    } catch (checkError) {
      setError(translateApiError(checkError, tRaw, t("updates.checkFailed")))
    } finally {
      setBusy(false)
    }
  }

  const runBackup = async () => {
    setBusy(true)
    setError(null)
    try {
      setBackup(await createBackup())
    } catch (backupError) {
      setError(translateApiError(backupError, tRaw, t("updates.backupFailed")))
    } finally {
      setBusy(false)
    }
  }

  const runApply = async () => {
    setError(null)
    setBackup(null)
    try {
      await apply(withBackup)
    } catch (applyError) {
      setError(translateApiError(applyError, tRaw, t("updates.applyFailed")))
    }
  }

  const runRollback = async () => {
    setError(null)
    setRollingBack(true)
    try {
      const updated = await rollback()
      setRollbackOpen(false)
      setRolledBack(updated.installedVersion)
    } catch (rollbackError) {
      setRollbackOpen(false)
      setError(
        translateApiError(rollbackError, tRaw, t("updates.rollbackFailed")),
      )
    } finally {
      setRollingBack(false)
    }
  }

  const runRestart = async () => {
    setError(null)
    setRestartError(null)
    setRestarting(true)
    if (status?.restartRequired) {
      writeRestartMarker({
        from: status.currentVersion,
        to: status.installedVersion,
        kind: status.behind ? "rollback" : "update",
      })
    }
    clearCachedStatus()
    try {
      const result = await restart()
      if (!result.restarting) {
        setRestarting(false)
        setRestartError(t("updates.restartNotAvailable"))
        return
      }
      const alive = await waitForApp()
      if (!alive) {
        setRestarting(false)
        setRestartError(t("updates.restartTimeout"))
      }
    } catch (restartFailure) {
      setRestarting(false)
      setRestartError(
        translateApiError(restartFailure, tRaw, t("updates.restartFailed")),
      )
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("updates.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("updates.description")}
        </p>
      </header>

      {applied ? (
        <UpdatesSuccessCard
          applied={applied}
          onDismiss={() => setApplied(null)}
        />
      ) : null}

      <UpdatesVersionCard
        status={status}
        backup={backup}
        error={error}
        busy={busy}
        checking={checking}
        applying={applying}
        onCheck={() => void runCheck()}
        onBackup={() => void runBackup()}
        onRollback={() => setRollbackOpen(true)}
      />

      {status?.behind && !status.restartRequired ? (
        <UpdatesApplyCard
          status={status}
          withBackup={withBackup}
          applying={applying}
          onBackupChange={setWithBackup}
          onApply={() => void runApply()}
        />
      ) : null}

      {job && job.step !== "done" ? <UpdatesJobCard job={job} /> : null}

      {status?.restartRequired ? (
        <UpdatesRestartCard
          status={status}
          restarting={restarting}
          restartError={restartError}
          onRestart={() => void runRestart()}
        />
      ) : null}

      {rolledBack ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("updates.rollbackTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {status?.restartRequired
                ? t("updates.rollbackDone", { version: rolledBack })
                : t("updates.rollbackDoneNow", { version: rolledBack })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("updates.rollbackConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("updates.rollbackConfirmDescription", {
                version: status?.rollbackTarget ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRollbackOpen(false)}
              disabled={rollingBack}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void runRollback()} disabled={rollingBack}>
              {rollingBack
                ? t("updates.rollingBack")
                : t("updates.rollbackConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
