"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useTranslation } from "@/lib/hooks/use-translation"

export interface AppliedUpdate {
  version: string
  kind: "update" | "rollback"
}

interface UpdatesSuccessCardProps {
  applied: AppliedUpdate
  onDismiss: () => void
}

export function UpdatesSuccessCard({
  applied,
  onDismiss,
}: UpdatesSuccessCardProps) {
  const { t } = useTranslation()

  return (
    <Card role="status" className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">
          {applied.kind === "rollback"
            ? t("updates.rollbackDoneNow", { version: applied.version })
            : t("updates.updatedTitle", { version: applied.version })}
        </CardTitle>
        <CardDescription>
          {applied.kind === "rollback"
            ? t("updates.rollbackUpdatedDescription")
            : t("updates.updatedDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {t("updates.updatedDismiss")}
        </Button>
      </CardContent>
    </Card>
  )
}
