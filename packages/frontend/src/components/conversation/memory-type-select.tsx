"use client"

import {
  MEMORY_TYPES,
  isMemoryType,
  type MemoryType,
} from "@workspace/shared/types/memory"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useTranslation } from "@/lib/hooks/use-translation"
import { memoryTypeLabelKey } from "@/lib/format-memory"

export const ALL_MEMORY_TYPES = "all"

export type MemoryTypeFilter = MemoryType | typeof ALL_MEMORY_TYPES

interface MemoryTypeSelectBaseProps {
  id?: string
  label: string
  className?: string
}

interface MemoryTypeSelectProps extends MemoryTypeSelectBaseProps {
  value: MemoryType
  onChange: (value: MemoryType) => void
}

interface MemoryTypeFilterSelectProps extends MemoryTypeSelectBaseProps {
  value: MemoryTypeFilter
  onChange: (value: MemoryTypeFilter) => void
}

function TypeItems({ includeAll }: { includeAll: boolean }) {
  const { t } = useTranslation()

  return (
    <SelectContent>
      {includeAll ? (
        <SelectItem value={ALL_MEMORY_TYPES}>{t("memory.typeAll")}</SelectItem>
      ) : null}
      {MEMORY_TYPES.map((type) => (
        <SelectItem key={type} value={type}>
          {t(memoryTypeLabelKey(type))}
        </SelectItem>
      ))}
    </SelectContent>
  )
}

export function MemoryTypeSelect({
  id,
  label,
  className,
  value,
  onChange,
}: MemoryTypeSelectProps) {
  const { t } = useTranslation()

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next && isMemoryType(next)) onChange(next)
      }}
    >
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue>{t(memoryTypeLabelKey(value))}</SelectValue>
      </SelectTrigger>
      <TypeItems includeAll={false} />
    </Select>
  )
}

export function MemoryTypeFilterSelect({
  id,
  label,
  className,
  value,
  onChange,
}: MemoryTypeFilterSelectProps) {
  const { t } = useTranslation()

  const labelOf = (current: MemoryTypeFilter) =>
    current === ALL_MEMORY_TYPES
      ? t("memory.typeAll")
      : t(memoryTypeLabelKey(current))

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === ALL_MEMORY_TYPES || isMemoryType(next)) onChange(next)
      }}
    >
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue>{labelOf(value)}</SelectValue>
      </SelectTrigger>
      <TypeItems includeAll />
    </Select>
  )
}
