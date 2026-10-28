"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { MemoryChangeProposalDTO } from "@workspace/shared/types/memory-change-proposal"
import type { MemoryDTO } from "@workspace/shared/types/memory"

import { useTranslation } from "@/lib/hooks/use-translation"

interface ProposalCardProps {
  proposal: MemoryChangeProposalDTO
  target: MemoryDTO | null
  onAccept: () => void
  onEdit: () => void
  onDiscard: () => void
}

const operationBadgeClass: Record<string, string> = {
  CREATE: "bg-green-600 text-white",
  UPDATE: "bg-blue-600 text-white",
  DELETE: "bg-red-600 text-white",
}

export function ProposalCard({
  proposal,
  target,
  onAccept,
  onEdit,
  onDiscard,
}: ProposalCardProps) {
  const { t } = useTranslation()
  const isCreate = proposal.operation === "CREATE"
  const isUpdate = proposal.operation === "UPDATE"
  const isDelete = proposal.operation === "DELETE"
  const targetMissing = !isCreate && !target

  const operationLabel = isCreate
    ? t("memory.proposalOperationCreate")
    : isUpdate
      ? t("memory.proposalOperationUpdate")
      : t("memory.proposalOperationDelete")

  const actor = !isCreate && target ? target.actor : proposal.actor
  const priority = isDelete && target ? target.priority : proposal.priority

  const changes =
    isUpdate && target
      ? [
          {
            label: t("memory.actor"),
            current: target.actor,
            next: proposal.actor,
          },
          {
            label: t("memory.title"),
            current: target.title,
            next: proposal.title,
          },
          {
            label: t("memory.description"),
            current: target.description,
            next: proposal.description,
          },
          {
            label: t("memory.priorityLabel"),
            current: String(target.priority),
            next: String(proposal.priority),
          },
        ].filter((change) => change.current !== change.next)
      : []

  const noChanges = isUpdate && Boolean(target) && changes.length === 0
  const acceptDisabled = targetMissing || noChanges

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Badge className={operationBadgeClass[proposal.operation]}>
          {operationLabel}
        </Badge>
        <span className="text-sm font-medium">{actor}</span>
        <Badge variant="outline" title={t("memory.priorityHelp")}>
          {priority}
        </Badge>
      </div>

      {isCreate ? (
        <>
          <span className="text-sm font-semibold">{proposal.title}</span>
          <p className="text-sm text-muted-foreground">
            {proposal.description}
          </p>
        </>
      ) : null}

      {isUpdate && target ? (
        <>
          <span className="text-sm font-semibold">{target.title}</span>
          {noChanges ? (
            <p className="text-xs text-muted-foreground">
              {t("memory.proposalNoChanges")}
            </p>
          ) : (
            <dl className="flex flex-col gap-1 text-xs">
              {changes.map((change) => (
                <div
                  key={change.label}
                  className="flex flex-wrap items-baseline gap-1"
                >
                  <dt className="font-medium">{change.label}:</dt>
                  <dd className="text-muted-foreground line-through">
                    {change.current}
                  </dd>
                  <dd aria-hidden>→</dd>
                  <dd>{change.next}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : null}

      {isDelete && target ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
          <p className="text-xs font-medium text-destructive">
            {t("memory.proposalDeleteTarget")}
          </p>
          <p className="text-sm font-semibold">{target.title}</p>
          <p className="text-sm text-muted-foreground">
            {target.description}
          </p>
        </div>
      ) : null}

      {targetMissing ? (
        <p className="text-sm text-destructive">
          {t("memory.proposalTargetMissing")}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isDelete ? "destructive" : "default"}
          onClick={onAccept}
          disabled={acceptDisabled}
        >
          {t("memory.accept")}
        </Button>
        {!isDelete && !targetMissing ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t("memory.editAndAccept")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          {t("memory.discard")}
        </Button>
      </div>
    </div>
  )
}
