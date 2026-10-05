import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { Badge } from "@workspace/ui/components/badge"

import type {
  DefaultProviderConfig,
  ProviderId,
  ProviderModel,
  ProviderStatus,
} from "@workspace/shared/types/provider"
import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

import {
  configureDefaultProvider,
  getDefaultProvider,
  setProviderModel,
} from "@/lib/api/settings"
import {
  listProviders,
  listProviderModels,
  validateProvider,
} from "@/lib/api/providers"
import {
  createProviderInstance,
  deleteProviderInstance,
  listProviderInstances,
  updateProviderInstance,
  validateProviderInstance,
} from "@/lib/api/provider-instances"
import { ApiClientError } from "@/lib/api/client"

import { ProviderCard, type CardStatus } from "./provider-card"
import { InstanceFormDialog } from "./instance-form-dialog"
import { useInstanceDialog } from "./use-instance-dialog"
import { useTranslation } from "@/lib/hooks/use-translation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import type { Locale } from "@workspace/shared/i18n"

function isError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError
}

function formatError(e: unknown, fallback: string): string {
  if (isError(e)) return `[${e.code}] ${e.message}`
  if (e instanceof Error) return e.message
  return fallback
}

export function ProviderManager({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <ProviderManagerContent />
    </I18nProvider>
  )
}

function ProviderManagerContent() {
  const { t } = useTranslation()
  const [registeredIds, setRegisteredIds] = useState<ProviderId[]>([])
  const [defaultConfig, setDefaultConfig] =
    useState<DefaultProviderConfig>({ provider: null, providerInstanceId: null, models: {} })

  const [instances, setInstances] = useState<ProviderInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  const [ollamaStatus, setOllamaStatus] = useState<CardStatus>("unknown")
  const [ollamaMessage, setOllamaMessage] = useState<string | undefined>(undefined)
  const [ollamaVerifying, setOllamaVerifying] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<ProviderModel[]>([])
  const [ollamaModelsLoading, setOllamaModelsLoading] = useState(false)
  const [ollamaModel, setOllamaModel] = useState("")

  const [openaiStatus, setOpenaiStatus] = useState<CardStatus>("unknown")
  const [openaiMessage, setOpenaiMessage] = useState<string | undefined>(undefined)
  const [openaiVerifying, setOpenaiVerifying] = useState(false)
  const [openaiModels, setOpenaiModels] = useState<ProviderModel[]>([])
  const [openaiModelsLoading, setOpenaiModelsLoading] = useState(false)
  const [openaiModel, setOpenaiModel] = useState("")

  const [savingDefault, setSavingDefault] = useState(false)
  const [savingOllamaModel, setSavingOllamaModel] = useState(false)
  const [savingOpenaiModel, setSavingOpenaiModel] = useState(false)

  const dialog = useInstanceDialog()

  const ollamaEnabled = registeredIds.includes("ollama")
  const openaiEnabled = registeredIds.includes("openai-compatible")

  const verifyOllama = useCallback(async () => {
    setOllamaVerifying(true)
    setOllamaStatus("loading")
    setOllamaMessage(undefined)
    try {
      const result = await validateProvider("ollama")
      setOllamaStatus(result.status)
      setOllamaMessage(result.message)
      if (result.status === "available") {
        setOllamaModelsLoading(true)
        try {
          const r = await listProviderModels("ollama")
          setOllamaModels(r.models)
        } catch (e) {
          toast.warning(t("providers.modelsListFailed"), {
            description: formatError(e, t("common.unknownError")),
          })
          setOllamaModels([])
        } finally {
          setOllamaModelsLoading(false)
        }
        toast.success(t("providers.connectionOk"), { description: t("providers.modelsLoaded") })
      }
    } catch (e) {
      setOllamaStatus("unavailable")
      setOllamaMessage(formatError(e, t("common.unknownError")))
    } finally {
      setOllamaVerifying(false)
    }
  }, [t])

  const verifyOpenAIForInstance = useCallback(async (instanceId: string) => {
    setOpenaiVerifying(true)
    setOpenaiStatus("loading")
    setOpenaiMessage(undefined)
    try {
      const result = await validateProviderInstance(instanceId)
      const status: ProviderStatus = result.status
      setOpenaiStatus(status)
      setOpenaiMessage(result.message)
      if (status === "available") {
        setOpenaiModelsLoading(true)
        try {
          const r = await listProviderModels("openai-compatible", instanceId)
          setOpenaiModels(r.models)
        } catch (e) {
          toast.warning(t("providers.modelsListFailed"), {
            description: formatError(e, t("common.unknownError")),
          })
          setOpenaiModels([])
        } finally {
          setOpenaiModelsLoading(false)
        }
        toast.success(t("providers.connectionOk"), { description: t("providers.modelsLoaded") })
      }
    } catch (e) {
      setOpenaiStatus("unavailable")
      setOpenaiMessage(formatError(e, t("common.unknownError")))
    } finally {
      setOpenaiVerifying(false)
    }
  }, [t])

  useEffect(() => {
    ;(async () => {
      try {
        const [ids, def, insts] = await Promise.all([
          listProviders(),
          getDefaultProvider(),
          listProviderInstances(),
        ])
        setRegisteredIds(ids.map((p) => p.id))
        setDefaultConfig(def)
        setInstances(insts)
        if (def.provider === "openai-compatible" && def.providerInstanceId) {
          setSelectedInstanceId(def.providerInstanceId)
        }
        if (def.provider === "ollama") {
          const saved = def.models.ollama
          if (saved) setOllamaModel(saved)
          void verifyOllama()
        } else if (def.provider === "openai-compatible") {
          const saved = def.models["openai-compatible"]
          if (saved) setOpenaiModel(saved)
          if (def.providerInstanceId) void verifyOpenAIForInstance(def.providerInstanceId)
        }
      } catch (e) {
        toast.error(t("providers.configLoadFailed"), {
          description: formatError(e, t("common.unknownError")),
        })
      }
    })()
  }, [verifyOllama, verifyOpenAIForInstance, t])

  const handleSelectInstance = useCallback((id: string) => {
    if (id === selectedInstanceId) return
    setSelectedInstanceId(id)
    setOpenaiModels([])
    setOpenaiStatus("unknown")
    setOpenaiMessage(undefined)
    void verifyOpenAIForInstance(id)
  }, [selectedInstanceId, verifyOpenAIForInstance])

  const handleCreateInstance = useCallback(
    async (name: string, url: string, apiKey: string) => {
      try {
        const instance = await createProviderInstance({
          kind: "openai-compatible",
          name: name.trim(),
          url: url.trim(),
          apiKey: apiKey.trim() || undefined,
        })
        setInstances((prev) => [...prev, instance])
        setSelectedInstanceId(instance.id)
        void verifyOpenAIForInstance(instance.id)
        dialog.close()
        toast.success(t("providers.instanceCreated"), { description: instance.name })
      } catch (e) {
        toast.error(t("providers.instanceCreateFailed"), { description: formatError(e, t("common.unknownError")) })
      }
    },
    [dialog, verifyOpenAIForInstance, t]
  )

  const handleUpdateInstance = useCallback(
    async (id: string, name: string, url: string, apiKey: string) => {
      try {
        const updated = await updateProviderInstance(id, {
          name: name.trim() || undefined,
          url: url.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        })
        setInstances((prev) => prev.map((i) => (i.id === id ? updated : i)))
        dialog.close()
        toast.success(t("providers.instanceUpdated"))
      } catch (e) {
        toast.error(t("providers.instanceUpdateFailed"), { description: formatError(e, t("common.unknownError")) })
      }
    },
    [dialog, t]
  )

  const handleDeleteInstance = useCallback(
    async (id: string) => {
      try {
        await deleteProviderInstance(id)
        setInstances((prev) => prev.filter((i) => i.id !== id))
        if (selectedInstanceId === id) setSelectedInstanceId(null)
        toast.success(t("providers.instanceDeleted"))
      } catch (e) {
        toast.error(t("providers.instanceDeleteFailed"), { description: formatError(e, t("common.unknownError")) })
      }
    },
    [selectedInstanceId, t]
  )

  const handleDialogSave = useCallback(
    (name: string, url: string, apiKey: string) => {
      if (dialog.state.mode === "edit" && dialog.state.editingInstance) {
        void handleUpdateInstance(dialog.state.editingInstance.id, name, url, apiKey)
      } else {
        void handleCreateInstance(name, url, apiKey)
      }
    },
    [dialog.state, handleCreateInstance, handleUpdateInstance]
  )

  const selectedInstanceName = useMemo(() => {
    if (!defaultConfig.providerInstanceId) return null
    return instances.find((i) => i.id === defaultConfig.providerInstanceId)?.name ?? null
  }, [defaultConfig.providerInstanceId, instances])

  const handleSetDefault = useCallback(
    async (provider: ProviderId) => {
      setSavingDefault(true)
      try {
        const providerInstanceId =
          provider === "openai-compatible" ? selectedInstanceId : null
        if (provider === "openai-compatible" && !providerInstanceId) {
          toast.error(t("providers.selectInstanceForDefault"))
          return
        }
        const result = await configureDefaultProvider({
          provider,
          providerInstanceId,
        })
        setDefaultConfig(result)
        toast.success(t("providers.defaultUpdated"))
      } catch (e) {
        toast.error(t("providers.defaultFailed"), {
          description: formatError(e, t("common.unknownError")),
        })
      } finally {
        setSavingDefault(false)
      }
    },
    [selectedInstanceId, t],
  )

  const handleSetModel = useCallback(
    async (provider: ProviderId, model: string) => {
      const setSaving = provider === "ollama" ? setSavingOllamaModel : setSavingOpenaiModel
      setSaving(true)
      try {
        const providerInstanceId =
          provider === "openai-compatible" ? (selectedInstanceId ?? undefined) : undefined
        if (provider === "openai-compatible" && !providerInstanceId) {
          toast.error(t("providers.selectInstanceForModel"))
          return
        }
        await setProviderModel(provider, model, { providerInstanceId })
        const def = await getDefaultProvider()
        setDefaultConfig(def)
        toast.success(t("providers.modelSaved", {
          provider: provider === "ollama" ? "Ollama" : "OpenAI-compatible",
        }))
      } catch (e) {
        toast.error(t("providers.modelSaveFailed"), {
          description: formatError(e, t("common.unknownError")),
        })
      } finally {
        setSaving(false)
      }
    },
    [selectedInstanceId, t],
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("providers.defaultTitle")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("providers.defaultDescription")}
        </p>
        <CurrentConfigPill
          provider={defaultConfig.provider}
          instanceName={selectedInstanceName}
          models={defaultConfig.models}
        />
      </header>

      {ollamaEnabled ? (
        <ProviderCard
          providerId="ollama"
          status={ollamaStatus}
          statusMessage={ollamaMessage}
          verifying={ollamaVerifying}
          onVerify={() => void verifyOllama()}
          model={ollamaModel}
          models={ollamaModels}
          modelsLoading={ollamaModelsLoading}
          onModelChange={setOllamaModel}
          onSetDefault={() => void handleSetDefault("ollama")}
          onSetModel={() => void handleSetModel("ollama", ollamaModel.trim())}
          savingDefault={savingDefault}
          savingModel={savingOllamaModel}
          isCurrentDefault={defaultConfig.provider === "ollama"}
          hasModel={!!defaultConfig.models.ollama}
        />
      ) : null}

      {openaiEnabled ? (
        <ProviderCard
          providerId="openai-compatible"
          status={openaiStatus}
          statusMessage={openaiMessage}
          verifying={openaiVerifying}
          onVerify={() => { if (selectedInstanceId) void verifyOpenAIForInstance(selectedInstanceId) }}
          verifyDisabled={!selectedInstanceId}
          model={openaiModel}
          models={openaiModels}
          modelsLoading={openaiModelsLoading}
          onModelChange={setOpenaiModel}
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={handleSelectInstance}
          onEditInstance={dialog.openEdit}
          onDeleteInstance={(id) => void handleDeleteInstance(id)}
          onCreateInstance={dialog.openCreate}
          onSetDefault={() => void handleSetDefault("openai-compatible")}
          onSetModel={() => void handleSetModel("openai-compatible", openaiModel.trim())}
          savingDefault={savingDefault}
          savingModel={savingOpenaiModel}
          isCurrentDefault={defaultConfig.provider === "openai-compatible"}
          hasModel={!!defaultConfig.models["openai-compatible"]}
        />
      ) : null}

      <InstanceFormDialog
        open={dialog.state.open}
        mode={dialog.state.mode}
        initialName={dialog.state.editingInstance?.name ?? ""}
        initialUrl={dialog.state.editingInstance?.url ?? ""}
        initialApiKey=""
        onClose={dialog.close}
        onSave={handleDialogSave}
      />
    </div>
  )
}

function CurrentConfigPill({
  provider,
  instanceName,
  models,
}: {
  provider: ProviderId | null
  instanceName: string | null
  models: Partial<Record<ProviderId, string>>
}) {
  const { t } = useTranslation()

  if (provider === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{t("providers.unconfigured")}</Badge>
        <span>{t("providers.unconfiguredHint")}</span>
      </div>
    )
  }
  const currentModel = provider ? models[provider] : null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("providers.currentProvider")}</span>
      <Badge variant="secondary">
        {provider === "ollama" ? "Ollama" : instanceName ?? "OpenAI-compatible"}
      </Badge>
      {currentModel ? (
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{currentModel}</code>
      ) : (
        <Badge variant="outline">{t("providers.noModel")}</Badge>
      )}
    </div>
  )
}
