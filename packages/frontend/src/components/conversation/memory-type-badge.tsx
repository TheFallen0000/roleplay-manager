import type { MemoryType } from "@workspace/shared/types/memory"
import { Badge } from "@workspace/ui/components/badge"

import { useTranslation } from "@/lib/hooks/use-translation"
import { memoryTypeLabelKey } from "@/lib/format-memory"

export function MemoryTypeBadge({ type }: { type: MemoryType }) {
  const { t } = useTranslation()

  return (
    <Badge variant="secondary" className="text-[10px]">
      {t(memoryTypeLabelKey(type))}
    </Badge>
  )
}
