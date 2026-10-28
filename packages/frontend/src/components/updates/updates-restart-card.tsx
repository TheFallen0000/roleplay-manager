"use client"

import type { UpdateStatusDTO } from "@workspace/shared/types/update"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useTranslation } from "@/lib/hooks/use-translation"

interface UpdatesRestartCardProps {
  status: UpdateStatusDTO
  restarting: boolean
  restartError: string | null
  onRestart: () => void
}

export function UpdatesRestartCard({
  status,
  restarting,
  restartError,
  onRestart,
}: UpdatesRestartCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("updates.restartPendingTitle")}
        </CardTitle>
        <CardDescription>
          {t("updates.restartPendingDescription", {
            running: status.currentVersion,
            installed: status.installedVersion,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t("updates.restartLaterHint")}
        </p>
        {status.canRestart ? (
          <Button
            variant="secondary"
            onClick={onRestart}
            disabled={restarting}
          >
            {restarting ? t("updates.restarting") : t("updates.restart")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("updates.restartManual")}
          </p>
        )}
        {restartError ? (
          <p role="alert" className="text-sm text-destructive">
            {restartError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
