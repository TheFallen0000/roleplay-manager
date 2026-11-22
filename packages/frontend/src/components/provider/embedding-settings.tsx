import { useCallback, useEffect, useId, useState } from "react"
import {
  KeyRoundIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react"

import type {
  EmbeddingConfigDTO,
  EmbeddingModelsDTO,
} from "@workspace/shared/types/embedding"
import type { ProviderId } from "@workspace/shared/types/provider"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  getEmbeddingConfig,
  reindexMemoryEmbeddings,
  setEmbeddingConfig,
} from "@/lib/api/embeddings"
import { formatApiError } from "@/lib/format-api-error"
import { useTranslation } from "@/lib/hooks/use-translation"

const DISABLED_PROVIDER = "disabled"

const PROVIDER_LABELS: Record<ProviderId, string> = {
  ollama: "Ollama",
  "openai-compatible": "OpenAI-compatible",
}

const MODEL_SUGGESTIONS = [
  "nomic-embed-text",
  "mxbai-embed-large",
  "all-minilm",
]

const modelSlot = (provider: ProviderId): keyof EmbeddingModelsDTO =>
  provider === "ollama" ? "ollama" : "openaiCompatible"

const isProviderId = (value: string): value is ProviderId =>
  value === "ollama" || value === "openai-compatible"

export function EmbeddingSettings() {
  const { t } = useTranslation()
  const modelListId = useId()

  const [config, setConfig] = useState<EmbeddingConfigDTO | null>(null)
  const [provider, setProvider] = useState<ProviderId | null>(null)
  const [models, setModels] = useState<EmbeddingModelsDTO>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [reindexError, setReindexError] = useState<Error | null>(null)
  const [reindexDone, setReindexDone] = useState(false)

  const applyConfig = useCallback((next: EmbeddingConfigDTO) => {
    setConfig(next)
    setProvider(next.provider)
    setModels(next.models)
  }, [])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      applyConfig(await getEmbeddingConfig())
      setLoadError(null)
    } catch (error) {
      setLoadError(error as Error)
    } finally {
      setLoading(false)
    }
  }, [applyConfig])

  const refreshConfig = useCallback(async () => {
    try {
      applyConfig(await getEmbeddingConfig())
      setLoadError(null)
    } catch (error) {
      setLoadError(error as Error)
    }
  }, [applyConfig])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const next = await getEmbeddingConfig()
        if (!active) return
        applyConfig(next)
        setLoadError(null)
      } catch (error) {
        if (active) setLoadError(error as Error)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [applyConfig])

  const activeModel = provider
    ? (models[modelSlot(provider)] ?? "")
    : ""

  const handleProviderChange = (next: string | null) => {
    setSaveError(null)
    if (!next || !isProviderId(next)) {
      setProvider(null)
      return
    }
    setProvider(next)
  }

  const handleModelChange = (value: string) => {
    if (!provider) return
    const slot = modelSlot(provider)
    setModels((current) => ({ ...current, [slot]: value }))
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await setEmbeddingConfig({
        provider,
        providerInstanceId:
          provider === "openai-compatible"
            ? (config?.providerInstanceId ?? null)
            : null,
        models,
      })
      applyConfig(updated)
    } catch (error) {
      setSaveError(error as Error)
    } finally {
      setSaving(false)
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    setReindexError(null)
    setReindexDone(false)
    try {
      await reindexMemoryEmbeddings()
      await refreshConfig()
      setReindexDone(true)
    } catch (error) {
      setReindexError(error as Error)
    } finally {
      setReindexing(false)
    }
  }

  const isRemote = provider === "openai-compatible"

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <SparklesIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold">
              {t("providers.embeddingHeading")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("providers.embeddingDescription")}
            </p>
          </div>
        </div>
        <Badge variant={config?.enabled ? "secondary" : "outline"}>
          {t(
            config?.enabled
              ? "providers.embeddingEnabled"
              : "providers.embeddingDisabled",
          )}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 border-t p-4">
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner aria-label={t("common.loading")} />
          </div>
        ) : loadError ? (
          <Alert variant="destructive">
            <ShieldAlertIcon />
            <AlertTitle>{t("providers.embeddingLoadFailed")}</AlertTitle>
            <AlertDescription>
              {formatApiError(loadError, t("common.unknownError"))}
            </AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadConfig()}
            >
              {t("common.retry")}
            </Button>
          </Alert>
        ) : (
          <>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="embedding-provider">
                  {t("providers.embeddingProviderLabel")}
                </FieldLabel>
                <Select
                  value={provider ?? DISABLED_PROVIDER}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger id="embedding-provider" className="w-full">
                    <SelectValue>
                      {provider
                        ? PROVIDER_LABELS[provider]
                        : t("providers.embeddingDisabled")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DISABLED_PROVIDER}>
                      {t("providers.embeddingDisabled")}
                    </SelectItem>
                    {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map(
                      (id) => (
                        <SelectItem key={id} value={id}>
                          {PROVIDER_LABELS[id]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="embedding-model">
                  {t("providers.embeddingModelLabel")}
                </FieldLabel>
                <Input
                  id="embedding-model"
                  value={activeModel}
                  list={modelListId}
                  disabled={!provider}
                  placeholder={MODEL_SUGGESTIONS[0]}
                  onChange={(event) => handleModelChange(event.target.value)}
                />
                <datalist id={modelListId}>
                  {MODEL_SUGGESTIONS.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
                <FieldDescription>
                  {t("providers.embeddingModelsHint")}
                </FieldDescription>
              </Field>
            </FieldGroup>

            {isRemote ? (
              <Alert>
                <ShieldAlertIcon />
                <AlertTitle>
                  {t("providers.embeddingPrivacyWarning")}
                </AlertTitle>
                {config?.hasApiKey ? (
                  <AlertDescription>
                    <span className="inline-flex items-center gap-1.5">
                      <KeyRoundIcon className="size-3.5" aria-hidden />
                      {t("providers.apiKeyLabel")}
                    </span>
                  </AlertDescription>
                ) : null}
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {t("providers.embeddingIndexed", {
                  count: config?.status.indexed ?? 0,
                })}
              </Badge>
              <Badge variant="outline">
                {t("providers.embeddingPending", {
                  count: config?.status.missing ?? 0,
                })}
              </Badge>
              {reindexDone ? (
                <span className="text-xs text-muted-foreground">
                  {t("providers.embeddingReindexDone")}
                </span>
              ) : null}
            </div>

            {saveError ? (
              <Alert variant="destructive">
                <ShieldAlertIcon />
                <AlertTitle>{t("providers.embeddingSaveFailed")}</AlertTitle>
                <AlertDescription>
                  {formatApiError(saveError, t("common.unknownError"))}
                </AlertDescription>
              </Alert>
            ) : null}

            {reindexError ? (
              <Alert variant="destructive">
                <ShieldAlertIcon />
                <AlertTitle>{t("providers.embeddingReindexFailed")}</AlertTitle>
                <AlertDescription>
                  {formatApiError(reindexError, t("common.unknownError"))}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleReindex()}
                disabled={reindexing || !config?.enabled}
              >
                {reindexing ? (
                  <Spinner />
                ) : (
                  <RefreshCwIcon className="size-3.5" />
                )}
                {reindexing
                  ? t("providers.embeddingReindexRunning")
                  : t("providers.embeddingReindex")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <Spinner /> : null}
                {t("common.save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
