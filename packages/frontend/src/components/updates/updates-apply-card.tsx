"use client"

import type { UpdateStatusDTO } from "@workspace/shared/types/update"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"

import { useTranslation } from "@/lib/hooks/use-translation"

interface UpdatesApplyCardProps {
  status: UpdateStatusDTO
  withBackup: boolean
  applying: boolean
  onBackupChange: (checked: boolean) => void
  onApply: () => void
}

export function UpdatesApplyCard({
  status,
  withBackup,
  applying,
  onBackupChange,
  onApply,
}: UpdatesApplyCardProps) {
  const { t, tRaw } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("updates.commitsTitle")}</CardTitle>
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
            <p className="text-xs font-medium">{t("updates.notesTitle")}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-xs text-muted-foreground">
              {status.notes}
            </pre>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span className="text-sm">{t("updates.backupLabel")}</span>
          <Switch
            checked={withBackup}
            onCheckedChange={onBackupChange}
            aria-label={t("updates.backupLabel")}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {t("updates.securityNote")}
        </p>

        <Button
          onClick={onApply}
          disabled={applying || status.blockedReason !== null}
        >
          {applying ? t("updates.applying") : t("updates.apply")}
        </Button>

        {status.blockedReason === "dirty" ? (
          <p role="alert" className="text-sm text-destructive">
            {tRaw("errors.UPDATE_DIRTY_WORKTREE", "")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
