import { useCallback, useEffect, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { ProviderId } from "@workspace/shared/types/provider"

import { formatApiError } from "@/lib/format-api-error"
import { useTranslation } from "@/lib/hooks/use-translation"
import {
  EMPTY_PROVIDER_RUNTIME,
  OLLAMA_KEY,
  useProviderStore,
} from "@/lib/stores/provider.store"

import { ProviderCard } from "@/components/shared/provider/provider-card"
import { InstanceFormDialog } from "@/components/shared/provider/instance-form-dialog"
import { useInstanceDialog } from "@/components/shared/provider/use-instance-dialog"

interface ModelSelectorProps {
  current: ConversationDetail
  onChange: (update: {
    provider: ProviderId | string | null
    providerInstanceId: string | null
    model: string | null
  }) => void
}

export function ModelSelector({ current, onChange }: ModelSelectorProps) {
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

  const [provider, setProvider] = useState<ProviderId | string | null>(current.provider ?? "ollama")
  const [providerInstanceId, setProviderInstanceId] = useState<string | null>(current.providerInstanceId ?? null)
  const [model, setModel] = useState<string | null>(current.model)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(current.providerInstanceId ?? null)

  const dialog = useInstanceDialog()

  useEffect(() => {
    onChange({ provider, providerInstanceId, model })
  }, [onChange, provider, providerInstanceId, model])

  const ollamaEnabled = registeredIds.includes("ollama")
  const openaiEnabled = registeredIds.includes("openai-compatible")

  const ollamaModel = model ?? ""
  const openaiModel = model ?? ""

  const ollamaRuntime = runtimes[OLLAMA_KEY] ?? EMPTY_PROVIDER_RUNTIME
  const openaiRuntime = selectedInstanceId
    ? (runtimes[selectedInstanceId] ?? EMPTY_PROVIDER_RUNTIME)
    : EMPTY_PROVIDER_RUNTIME

  useEffect(() => {
    ;(async () => {
      try {
        await load()
        if (current.provider === "ollama") {
          void verifyOllama()
        } else if (current.provider === "openai-compatible" && current.providerInstanceId) {
          setSelectedInstanceId(current.providerInstanceId)
          void verifyInstance(current.providerInstanceId)
        }
      } catch (error) {
        toast.error(t("settings.providersLoadFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    })()
  }, [current.provider, current.providerInstanceId, load, verifyOllama, verifyInstance, t])

  const handleSelectProvider = useCallback(
    (id: ProviderId | string) => {
      if (id === provider) return
      if (id === "ollama") {
        setProvider("ollama")
        setProviderInstanceId(null)
        void verifyOllama()
      } else {
        setProvider("openai-compatible")
        setProviderInstanceId(selectedInstanceId)
      }
      setModel(null)
    },
    [provider, selectedInstanceId, verifyOllama],
  )

  const handleSelectInstance = useCallback(
    (id: string) => {
      if (id === selectedInstanceId) return
      setSelectedInstanceId(id)
      setProviderInstanceId(id)
      setModel(null)
      void verifyInstance(id)
    },
    [selectedInstanceId, verifyInstance],
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
        setProviderInstanceId(instance.id)
        setModel(null)
        void verifyInstance(instance.id)
        dialog.close()
        toast.success(t("settings.instanceCreated"), { description: instance.name })
      } catch (error) {
        toast.error(t("settings.instanceCreateFailed"), {
          description: formatApiError(error, t("common.unknownError")),
        })
      }
    },
    [createInstance, verifyInstance, dialog, t],
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
        toast.success(t("settings.instanceUpdated"))
      } catch (error) {
        toast.error(t("settings.instanceUpdateFailed"), {
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
        if (selectedInstanceId === id) {
          setSelectedInstanceId(null)
          setProviderInstanceId(null)
        }
        toast.success(t("settings.instanceDeleted"))
      } catch (error) {
        toast.error(t("settings.instanceDeleteFailed"), {
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

  const handleModelChange = useCallback((value: string) => {
    setModel(value || null)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("settings.providerLabel")}</span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={provider === "ollama" ? "default" : "outline"}
            size="sm"
            disabled={!ollamaEnabled}
            onClick={() => handleSelectProvider("ollama")}
          >
            {!ollamaEnabled ? <Spinner /> : null}
            Ollama (local)
          </Button>
          <Button
            type="button"
            variant={provider === "openai-compatible" ? "default" : "outline"}
            size="sm"
            disabled={!openaiEnabled}
            onClick={() => handleSelectProvider("openai-compatible")}
          >
            OpenAI-compatible
          </Button>
        </div>
      </div>

      {provider === "ollama" ? (
        <ProviderCard
          providerId="ollama"
          mode="local"
          status={ollamaRuntime.status}
          statusMessage={ollamaRuntime.message}
          verifying={ollamaRuntime.verifying}
          onVerify={() => void verifyOllama()}
          model={ollamaModel}
          models={ollamaRuntime.models}
          modelsLoading={ollamaRuntime.modelsLoading}
          onModelChange={handleModelChange}
        />
      ) : (
        <ProviderCard
          providerId="openai-compatible"
          mode="local"
          status={openaiRuntime.status}
          statusMessage={openaiRuntime.message}
          verifying={openaiRuntime.verifying}
          onVerify={() => { if (selectedInstanceId) void verifyInstance(selectedInstanceId) }}
          verifyDisabled={!selectedInstanceId}
          model={openaiModel}
          models={openaiRuntime.models}
          modelsLoading={openaiRuntime.modelsLoading}
          onModelChange={handleModelChange}
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={handleSelectInstance}
          onEditInstance={dialog.openEdit}
          onDeleteInstance={(id) => void handleDeleteInstance(id)}
          onCreateInstance={dialog.openCreate}
        />
      )}

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
