import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { PlusIcon, PencilIcon, Trash2Icon, CheckIcon } from "lucide-react"

import type { ProviderInstance } from "@workspace/shared/types/provider-instance"
import { useTranslation } from "@/lib/hooks/use-translation"

interface InstanceListProps {
  instances: ProviderInstance[]
  selectedInstanceId: string | null
  onSelect: (id: string) => void
  onEdit: (instance: ProviderInstance) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
}

export function InstanceList({
  instances,
  selectedInstanceId,
  onSelect,
  onEdit,
  onDelete,
  onCreateNew,
}: InstanceListProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("providers.instancesTitle")}</CardTitle>
        <CardDescription>
          {t("providers.instancesDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {instances.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{t("providers.instancesEmptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("providers.instancesEmptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {instances.map((inst) => {
              const selected = selectedInstanceId === inst.id
              return (
                <div
                  key={inst.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                    onClick={() => onSelect(inst.id)}
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                      {inst.name}
                      {selected ? (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <CheckIcon className="size-3" /> {t("providers.selected")}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate text-xs text-muted-foreground">
                      {inst.url || t("providers.noUrl")}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onEdit(inst)}
                      aria-label={t("providers.editInstanceAria", { name: inst.name })}
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => onDelete(inst.id)}
                      aria-label={t("providers.deleteInstanceAria", { name: inst.name })}
                    >
                      <Trash2Icon className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onCreateNew}>
          <PlusIcon /> {t("providers.newInstance")}
        </Button>
      </CardContent>
    </Card>
  )
}
