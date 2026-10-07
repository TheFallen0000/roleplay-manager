import { useMemo } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"

import type { ProviderModel } from "@workspace/shared/types/provider"
import { useTranslation } from "@/lib/hooks/use-translation"

interface ModelComboboxProps {
  value: string
  models: ProviderModel[]
  disabled?: boolean
  placeholder?: string
  onChange: (value: string) => void
}

export function ModelCombobox({
  value,
  models,
  disabled = false,
  placeholder,
  onChange,
}: ModelComboboxProps) {
  const { t } = useTranslation()
  const displayValue = useMemo(() => {
    if (!value) return value
    const item = models.find((m) => m.id === value)
    return item?.name ?? item?.id ?? value
  }, [value, models])

  return (
    <Combobox
      items={models}
      value={value || null}
      onValueChange={(v) => onChange(v ?? "")}
      inputValue={displayValue}
      onInputValueChange={(v) => {
        if (v !== displayValue) onChange(v)
      }}
    >
      <ComboboxInput
        disabled={disabled}
        placeholder={placeholder ?? t("providers.selectModel")}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxList>
          {(m: ProviderModel) => (
            <ComboboxItem key={m.id} value={m.id}>
              {m.name ?? m.id}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>{t("providers.noModelsFound")}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}
