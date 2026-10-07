import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { Badge } from "@workspace/ui/components/badge"

import type {
  DefaultProviderConfig,
  ProviderId,
} from "@workspace/shared/types/provider"
import type { Locale } from "@workspace/shared/i18n"

import {
  configureDefaultProvider,
  getDefaultProvider,
  setProviderModel,
} from "@/lib/api/settings"
import { formatApiError } from "@/lib/format-api-error"
import { useTranslation } from "@/lib/hooks/use-translation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import {
  EMPTY_PROVIDER_RUNTIME,
  OLLAMA_KEY,
  useProviderStore,
  type VerifyProviderResult,
} from "@/lib/stores/provider.store"

import { ProviderCard } from "@/components/shared/provider/provider-card"
import { InstanceFormDialog } from "@/components/shared/provider/instance-form-dialog"
import { useInstanceDialog } from "@/components/shared/provider/use-instance-dialog"

export function ProviderManager({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <ProviderManagerContent />
    </I18nProvider>
  )
}

function ProviderManagerContent() {
  const { t } = useTranslation()

  const registeredIds = useProviderStore((state) => state.registeredIds)
  const instances = useProviderStore((state) => state.instances)
  const runtimes = useProviderStore((state) => state.runtimes)
  const load = useProviderStore((state) => state.load)
  const createInstance = useProviderStore((state) => state.createInstance)
  const updateInstance = useProviderStore((state) => state.updateInstance)
  const deleteInstance = useProviderStore((state) => state.deleteInstance)
  const verifyOllama = useProviderStore((state) => state.verifyOllama)
  const verifyInstance = useProviderStore((state) => state.verifyInstance)

  const [defaultConfig, setDefaultConfig] =
    useState<DefaultProviderConfig>({ provider: null, providerInstanceId: null, models: {} })
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [ollamaModel, setOllamaModel] = useState("")
  const [openaiModel, setOpenaiModel] = useState("")

  const [savingDefault, setSavingDefault] = useState(false)
  const [savingOllamaModel, setSavingOllamaModel] = useState(false)
  const [savingOpenaiModel, setSavingOpenaiModel] = useState(false)

  const dialog = useInstanceDialog()

  const ollamaEnabled = registeredIds.includes("ollama")
  const openaiEnabled = registeredIds.includes("openai-compatible")

  const ollamaRuntime = runtimes[OLLAMA_KEY] ?? EMPTY_PROVIDER_RUNTIME
  const openaiRuntime = selectedInstanceId
    ? (runtimes[selectedInstanceId] ?? EMPTY_PROVIDER_RUNTIME)
    : EMPTY_PROVIDER_RUNTIME

  const verifyWithToasts = useCallback(
    async (check: () => Promise<VerifyProviderResult>): Promise<void> => {
      const result = await check()
      if (result.ok) {
        toast.success(t("providers.connectionOk"), {
          description: t("providers.modelsLoaded"),
        })
        return
      }
      if (result.modelsFailed) {
        toast.warning(t("providers.modelsListFailed"), {
          description: result.message,
        })
      }
    },
    [t],
  )

  const runVerifyOllama = useCallback(
    () => verifyWithToasts(() => verifyOllama()),
    [verifyWithToasts, verifyOllama],
  )

  const runVerifyInstance = useCallback(
    (id: string) => verifyWithToasts(() => verifyInstance(id)),
    [verifyWithToasts, verifyInstance],
  )

  useEffect(() => {
    ;(async () => {
      try {
        const [, config] = await Promise.all([load(), getDefaultProvider()])
        setDefaultConfig(config)
        if (config.provider === "openai-compatible" && config.providerInstanceId) {
          setSelectedInstanceId(config.providerInstanceId)
        }
        if (config.provider === "ollama") {
          const saved = config.models.ollama
          if (saved) setOllamaModel(saved)
          void runVerifyOllama()
        } else if (config.provider === "openai-compatible") {
          const saved = config.models["openai-compatible"]
          if (saved) setOpenaiModel(saved)
          if (config.providerInstanceId) {
            void runVerifyInstance(config.providerInstanceId)
          }
        }
      } catch (error) {
        toast.error(t("providers.configLoadFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    })()
  }, [load, runVerifyOllama, runVerifyInstance, t])

  const handleSelectInstance = useCallback(
    (id: string) => {
      if (id === selectedInstanceId) return
      setSelectedInstanceId(id)
      void runVerifyInstance(id)
    },
    [selectedInstanceId, runVerifyInstance],
  )

  const handleCreateInstance = useCallback(
    async (name: string, url: string, apiKey: string) => {
      try {
        const instance = await createInstance({
          kind: "openai-compatible",
          name: name.trim(),
          url: url.trim(),
          apiKey: apiKey.trim() || undefined,
        })
        setSelectedInstanceId(instance.id)
        void runVerifyInstance(instance.id)
        dialog.close()
        toast.success(t("providers.instanceCreated"), {
          description: instance.name,
        })
      } catch (error) {
        toast.error(t("providers.instanceCreateFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    },
    [createInstance, runVerifyInstance, dialog, t],
  )

  const handleUpdateInstance = useCallback(
    async (id: string, name: string, url: string, apiKey: string) => {
      try {
        await updateInstance(id, {
          name: name.trim() || undefined,
          url: url.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        })
        dialog.close()
        toast.success(t("providers.instanceUpdated"))
      } catch (error) {
        toast.error(t("providers.instanceUpdateFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    },
    [updateInstance, dialog, t],
  )

  const handleDeleteInstance = useCallback(
    async (id: string) => {
      try {
        await deleteInstance(id)
        if (selectedInstanceId === id) setSelectedInstanceId(null)
        toast.success(t("providers.instanceDeleted"))
      } catch (error) {
        toast.error(t("providers.instanceDeleteFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    },
    [deleteInstance, selectedInstanceId, t],
  )

  const handleDialogSave = useCallback(
    (name: string, url: string, apiKey: string) => {
      if (dialog.state.mode === "edit" && dialog.state.editingInstance) {
        void handleUpdateInstance(dialog.state.editingInstance.id, name, url, apiKey)
      } else {
        void handleCreateInstance(name, url, apiKey)
      }
    },
    [dialog.state, handleCreateInstance, handleUpdateInstance],
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
      } catch (error) {
        toast.error(t("providers.defaultFailed"), {
          description: formatApiError(error, t("common.unknownError")),
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
        const config = await getDefaultProvider()
        setDefaultConfig(config)
        toast.success(t("providers.modelSaved", {
          provider: provider === "ollama" ? "Ollama" : "OpenAI-compatible",
        }))
      } catch (error) {
        toast.error(t("providers.modelSaveFailed"), {
          description: formatApiError(error, t("common.unknownError")),
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
          status={ollamaRuntime.status}
          statusMessage={ollamaRuntime.message}
          verifying={ollamaRuntime.verifying}
          onVerify={() => void runVerifyOllama()}
          model={ollamaModel}
          models={ollamaRuntime.models}
          modelsLoading={ollamaRuntime.modelsLoading}
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
          status={openaiRuntime.status}
          statusMessage={openaiRuntime.message}
          verifying={openaiRuntime.verifying}
          onVerify={() => { if (selectedInstanceId) void runVerifyInstance(selectedInstanceId) }}
          verifyDisabled={!selectedInstanceId}
          model={openaiModel}
          models={openaiRuntime.models}
          modelsLoading={openaiRuntime.modelsLoading}
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
