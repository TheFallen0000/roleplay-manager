import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

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

/** Instances as hairline rows so the provider card never nests another card. */
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
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{t("providers.instancesTitle")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("providers.instancesDescription")}
        </p>
      </div>

      {instances.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center">
          <p className="text-sm font-medium">
            {t("providers.instancesEmptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("providers.instancesEmptyDescription")}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border">
          {instances.map((inst, index) => {
            const selected = selectedInstanceId === inst.id
            return (
              <li
                key={inst.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2",
                  index > 0 && "border-t",
                  selected ? "bg-primary-soft" : "hover:bg-muted/50",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                  aria-pressed={selected}
                  onClick={() => onSelect(inst.id)}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                    {inst.name}
                    {selected ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-primary/35 bg-primary-soft text-primary"
                      >
                        <CheckIcon className="size-3" />{" "}
                        {t("providers.selected")}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
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
              </li>
            )
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={onCreateNew}
      >
        <PlusIcon /> {t("providers.newInstance")}
      </Button>
    </section>
  )
}
