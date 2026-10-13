import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertCircleIcon,
  CircleDotIcon,
  CpuIcon,
  PlugIcon,
  RefreshCwIcon,
  StarIcon,
} from "lucide-react"

import type { ProviderId, ProviderModel, ProviderStatus } from "@workspace/shared/types/provider"

import { ModelCombobox } from "./model-combobox"
import { InstanceList } from "./instance-list"
import type { ProviderInstance } from "@workspace/shared/types/provider-instance"
import { useTranslation } from "@/lib/hooks/use-translation"
import type { TranslationKey } from "@workspace/shared/i18n"

export type CardStatus = ProviderStatus | "loading" | "unknown"

const STATUS_LABEL_KEYS: Record<CardStatus, TranslationKey> = {
  available: "providers.statusAvailable",
  unavailable: "providers.statusUnavailable",
  unconfigured: "providers.statusUnconfigured",
  unknown: "providers.statusUnknown",
  loading: "providers.statusLoading",
}

/** The dot carries the colour; the label stays ink and readable. */
const STATUS_DOT: Record<CardStatus, string> = {
  available: "bg-emerald-500",
  unavailable: "bg-destructive",
  unconfigured: "bg-muted-foreground/50",
  unknown: "bg-muted-foreground/50",
  loading: "bg-muted-foreground/50",
}

interface BaseProps {
  status: CardStatus
  statusMessage?: string
  verifying: boolean
  onVerify: () => void
  onSetDefault?: () => void
  onSetModel?: () => void
  savingDefault?: boolean
  savingModel?: boolean
  isCurrentDefault?: boolean
  hasModel?: boolean
  mode?: "global" | "local"
}

interface OllamaProps extends BaseProps {
  providerId: "ollama"
  model: string
  models: ProviderModel[]
  modelsLoading: boolean
  onModelChange: (value: string) => void
}

interface OpenAIProps extends BaseProps {
  providerId: "openai-compatible"
  model: string
  models: ProviderModel[]
  modelsLoading: boolean
  onModelChange: (value: string) => void
  instances: ProviderInstance[]
  selectedInstanceId: string | null
  onSelectInstance: (id: string) => void
  onEditInstance: (instance: ProviderInstance) => void
  onDeleteInstance: (id: string) => void
  onCreateInstance: () => void
  verifyDisabled?: boolean
}

type ProviderCardProps = OllamaProps | OpenAIProps

export function ProviderCard(props: ProviderCardProps) {
  const { t } = useTranslation()
  const title = props.providerId === "ollama" ? "Ollama (local)" : "OpenAI-compatible"
  const description =
    props.providerId === "ollama"
      ? t("providers.ollamaDescription")
      : t("providers.openaiDescription")
  const Icon = props.providerId === "ollama" ? CpuIcon : PlugIcon

  const verifyButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={props.onVerify}
      disabled={
        props.verifying ||
        (props.providerId === "openai-compatible" && props.verifyDisabled)
      }
    >
      {props.verifying ? <Spinner /> : <RefreshCwIcon />}
      {t("providers.testConnection")}
    </Button>
  )

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <StatusChip status={props.status} />
      </div>

      <div className="flex flex-col gap-4 border-t p-4">
        {props.statusMessage && props.status !== "available" ? (
          <Alert variant={props.status === "unavailable" ? "destructive" : "default"}>
            {props.status === "unavailable" ? <AlertCircleIcon /> : <CircleDotIcon />}
            <AlertTitle>{t(STATUS_LABEL_KEYS[props.status])}</AlertTitle>
            <AlertDescription>{props.statusMessage}</AlertDescription>
          </Alert>
        ) : null}

        {props.providerId === "openai-compatible" ? (
          <InstanceList
            instances={props.instances}
            selectedInstanceId={props.selectedInstanceId}
            onSelect={props.onSelectInstance}
            onEdit={props.onEditInstance}
            onDelete={props.onDeleteInstance}
            onCreateNew={props.onCreateInstance}
          />
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${props.providerId}-model`}>{t("providers.modelLabel")}</FieldLabel>
            {props.modelsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> {t("providers.modelsLoading")}
              </div>
            ) : (
              <ModelCombobox
                value={props.model}
                models={props.models}
                onChange={props.onModelChange}
                placeholder={
                  props.models.length === 0
                    ? t("providers.modelPlaceholderEmpty")
                    : t("providers.modelPlaceholder")
                }
              />
            )}
            <FieldDescription>
              {props.models.length > 0
                ? t("providers.modelsAvailable", { count: props.models.length })
                : t("providers.modelsHint")}
            </FieldDescription>
          </Field>
        </FieldGroup>

        {props.mode !== "local" ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {verifyButton}
            <Button
              type="button"
              variant={props.isCurrentDefault ? "secondary" : "outline"}
              size="sm"
              onClick={props.onSetDefault}
              disabled={props.savingDefault || props.status !== "available"}
            >
              {props.savingDefault ? <Spinner /> : <StarIcon className="size-3.5" />}
              {props.isCurrentDefault ? t("providers.isDefault") : t("providers.setDefault")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={props.onSetModel}
              disabled={props.savingModel || !props.model.trim() || props.status !== "available"}
            >
              {props.savingModel ? <Spinner /> : null}
              {props.hasModel ? t("providers.updateModel") : t("providers.setModel")}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">{verifyButton}</div>
        )}
      </div>
    </Card>
  )
}

function StatusChip({ status }: { status: CardStatus }) {
  const { t } = useTranslation()

  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      {status === "loading" ? (
        <Spinner />
      ) : (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", STATUS_DOT[status])}
        />
      )}
      {t(STATUS_LABEL_KEYS[status])}
    </Badge>
  )
}

export type { ProviderId }
