import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { CheckCircle2Icon, AlertCircleIcon, RefreshCwIcon, ServerIcon, CircleDotIcon, StarIcon } from "lucide-react"

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

const STATUS_VARIANT: Record<
  CardStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  available: "default",
  unavailable: "destructive",
  unconfigured: "outline",
  unknown: "outline",
  loading: "secondary",
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerIcon className="size-4 text-muted-foreground" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StatusBadge status={props.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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

        <div className="flex justify-end">
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
        </div>

        {props.mode !== "local" ? (
          <>
            <Separator />

            <div className="flex flex-wrap items-center justify-end gap-2">
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
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: CardStatus }) {
  const { t } = useTranslation()
  if (status === "loading") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Spinner /> {t(STATUS_LABEL_KEYS.loading)}
      </Badge>
    )
  }
  if (status === "available") {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2Icon className="size-3" /> {t(STATUS_LABEL_KEYS.available)}
      </Badge>
    )
  }
  return (
    <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL_KEYS[status])}</Badge>
  )
}

export type { ProviderId }
