"use client"

import type { UpdateJobDTO } from "@workspace/shared/types/update"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useTranslation } from "@/lib/hooks/use-translation"

interface UpdatesJobCardProps {
  job: UpdateJobDTO
}

export function UpdatesJobCard({ job }: UpdatesJobCardProps) {
  const { t } = useTranslation()

  const stepLabel = (): string => {
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
      </CardContent>
    </Card>
  )
}
