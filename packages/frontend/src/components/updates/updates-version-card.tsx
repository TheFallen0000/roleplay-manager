"use client"

import { RefreshCwIcon } from "lucide-react"

import type {
  BackupResultDTO,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useTranslation } from "@/lib/hooks/use-translation"

interface UpdatesVersionCardProps {
  status: UpdateStatusDTO | null
  backup: BackupResultDTO | null
  error: string | null
  busy: boolean
  checking: boolean
  applying: boolean
  onCheck: () => void
  onBackup: () => void
  onRollback: () => void
}

export function UpdatesVersionCard({
  status,
  backup,
  error,
  busy,
  checking,
  applying,
  onCheck,
  onBackup,
  onRollback,
}: UpdatesVersionCardProps) {
  const { t } = useTranslation()

  return (
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
          {status?.restartRequired ? (
            <div>
              <span className="text-muted-foreground">
                {t("updates.installedVersion")}:{" "}
              </span>
              <span className="font-mono">{status.installedVersion}</span>
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">
              {t("updates.latestVersion")}:{" "}
            </span>
            <span className="font-mono">{status?.latestVersion ?? "—"}</span>
          </div>
          {status?.behind ? <Badge>{t("updates.badge")}</Badge> : null}
          {status?.restartRequired ? (
            <Badge variant="secondary">
              {t("updates.restartRequiredBadge")}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCheck}
            disabled={busy || checking}
          >
            <RefreshCwIcon />
            {checking ? t("updates.checking") : t("updates.checkNow")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBackup}
            disabled={busy}
          >
            {t("updates.backupNow")}
          </Button>
        </div>

        {status?.checkError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("updates.checkError", { message: status.checkError })}
          </p>
        ) : null}

        {status?.blockedReason === "not-a-repo" ? (
          <p className="text-sm text-muted-foreground">
            {t("updates.notARepo")}
          </p>
        ) : null}

        {status?.blockedReason === "no-asset" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("updates.noAsset")}
          </p>
        ) : null}

        {status?.blockedReason === "no-checksum" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("updates.noChecksum")}
          </p>
        ) : null}

        {status?.blockedReason === "no-signature" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("updates.noSignature")}
          </p>
        ) : null}

        {status &&
        !status.behind &&
        !status.restartRequired &&
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

        {status?.rollbackTarget ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t("updates.rollbackTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("updates.rollbackDescription", {
                  version: status.rollbackTarget,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRollback}
              disabled={busy || applying}
            >
              {t("updates.rollback", { version: status.rollbackTarget })}
            </Button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
