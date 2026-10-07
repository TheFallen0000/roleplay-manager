"use client"

import { useEffect, useState } from "react"
import { RefreshCwIcon } from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import type { BackupResultDTO } from "@workspace/shared/types/update"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"
import { getHealth } from "@/lib/api/health"
import { useUpdatesStore } from "@/lib/stores/updates.store"
import { translateApiError } from "@/lib/translate-api-error"

/** Waits until the app answers again (it restarts after applying an update). */
const RECONNECT_ATTEMPTS = 120
const RECONNECT_INTERVAL_MS = 1000

const waitForApp = async (): Promise<void> => {
  for (let attempt = 0; attempt < RECONNECT_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_INTERVAL_MS))
    try {
      await getHealth()
      window.location.reload()
      return
    } catch {
      // Still restarting.
    }
  }
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
  const createBackup = useUpdatesStore((state) => state.createBackup)
  const restart = useUpdatesStore((state) => state.restart)

  const [withBackup, setWithBackup] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<BackupResultDTO | null>(null)
  const [busy, setBusy] = useState(false)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    hydrateFromCache()
  }, [hydrateFromCache])

  useEffect(() => {
    if (!shouldCheck()) return
    check().catch((checkError) =>
      setError(translateApiError(checkError, tRaw, t("updates.checkFailed"))),
    )
  }, [check, shouldCheck, t, tRaw])

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

  const runRestart = async () => {
    setError(null)
    setRestarting(true)
    try {
      const result = await restart()
      if (!result.restarting) {
        setRestarting(false)
        setError(t("updates.restartNotAvailable"))
        return
      }
      await waitForApp()
      setRestarting(false)
    } catch (restartError) {
      setRestarting(false)
      setError(
        translateApiError(restartError, tRaw, t("updates.restartFailed")),
      )
    }
  }

  const stepLabel = (): string | null => {
    if (!job) return null
    switch (job.step) {
      case "backup":
        return t("updates.stepBackup")
      case "download":
        return t("updates.stepDownload")
      case "pull":
        return t("updates.stepPull")
      case "install":
        return t("updates.stepInstall")
      case "done":
        return t("updates.done")
      case "failed":
        return t("updates.failed", { message: job.message ?? "" })
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("updates.versionTitle")}</CardTitle>
          <CardDescription>
            {status?.checkedAt
              ? t("updates.lastChecked", {
                  date: new Date(status.checkedAt).toLocaleString(),
                })
              : t("updates.neverChecked")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t("updates.currentVersion")}:{" "}
              </span>
              <span className="font-mono">{status?.currentVersion ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("updates.latestVersion")}:{" "}
              </span>
              <span className="font-mono">{status?.latestVersion ?? "—"}</span>
            </div>
            {status?.behind ? <Badge>{t("updates.badge")}</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runCheck()}
              disabled={busy || checking}
            >
              <RefreshCwIcon />
              {checking ? t("updates.checking") : t("updates.checkNow")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBackup()}
              disabled={busy}
            >
              {t("updates.backupNow")}
            </Button>
          </div>

          {status?.checkError ? (
            <p className="text-sm text-destructive">
              {t("updates.checkError", { message: status.checkError })}
            </p>
          ) : null}

          {status?.blockedReason === "not-a-repo" ? (
            <p className="text-sm text-muted-foreground">
              {t("updates.notARepo")}
            </p>
          ) : null}

          {status?.blockedReason === "no-asset" ? (
            <p className="text-sm text-destructive">{t("updates.noAsset")}</p>
          ) : null}

          {status &&
          !status.behind &&
          !status.checkError &&
          status.blockedReason === null ? (
            <p className="text-sm text-muted-foreground">
              {t("updates.upToDate")}
            </p>
          ) : null}

          {backup ? (
            <p className="text-sm text-muted-foreground">
              {t("updates.backupCreated", { path: backup.path })}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {status?.behind ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("updates.commitsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {status.commits.length > 0 ? (
              <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                {status.commits.map((commit) => (
                  <li key={commit} className="truncate">
                    {commit}
                  </li>
                ))}
              </ul>
            ) : null}

            {status.notes ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium">
                  {t("updates.notesTitle")}
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-xs text-muted-foreground">
                  {status.notes}
                </pre>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span className="text-sm">{t("updates.backupLabel")}</span>
              <Switch
                checked={withBackup}
                onCheckedChange={(checked) => setWithBackup(checked)}
                aria-label={t("updates.backupLabel")}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("updates.securityNote")}
            </p>

            <Button
              onClick={() => void runApply()}
              disabled={applying || status.blockedReason !== null}
            >
              {applying ? t("updates.applying") : t("updates.apply")}
            </Button>

            {status.blockedReason === "dirty" ? (
              <p className="text-sm text-destructive">
                {tRaw("errors.UPDATE_DIRTY_WORKTREE", "")}
              </p>
            ) : null}

          </CardContent>
        </Card>
      ) : null}

      {job ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("updates.jobTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">{stepLabel()}</p>

            {job.step !== "failed" && job.message ? (
              <p className="text-xs text-muted-foreground">{job.message}</p>
            ) : null}

            {job.retry ? (
              <p className="text-xs text-muted-foreground">
                {t("updates.retrying", {
                  attempt: String(job.retry.attempt),
                  attempts: String(job.retry.attempts),
                })}
              </p>
            ) : null}

            {job.step === "done" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {t("updates.restartHint")}
                </p>
                {status?.canRestart ? (
                  <Button
                    variant="secondary"
                    onClick={() => void runRestart()}
                    disabled={restarting}
                  >
                    {restarting
                      ? t("updates.restarting")
                      : t("updates.restart")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
