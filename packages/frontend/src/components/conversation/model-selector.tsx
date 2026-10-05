import { useCallback, useEffect, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { ProviderCard, type CardStatus } from "@/components/provider/provider-card"
import { InstanceFormDialog } from "@/components/provider/instance-form-dialog"
import { useInstanceDialog } from "@/components/provider/use-instance-dialog"
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
import { useTranslation } from "@/lib/hooks/use-translation"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { ProviderId, ProviderModel } from "@workspace/shared/types/provider"
import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

interface ModelSelectorProps {
  current: ConversationDetail
  onChange: (update: {
    provider: ProviderId | string | null
    providerInstanceId: string | null
    model: string | null
  }) => void
}

function isError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError
}

function formatError(e: unknown): string {
  if (isError(e)) return `[${e.code}] ${e.message}`
  if (e instanceof Error) return e.message
  return "Error desconocido"
}

export function ModelSelector({ current, onChange }: ModelSelectorProps) {
  const { t } = useTranslation()
  const [provider, setProvider] = useState<ProviderId | string | null>(current.provider ?? "ollama")
  const [providerInstanceId, setProviderInstanceId] = useState<string | null>(current.providerInstanceId ?? null)
  const [model, setModel] = useState<string | null>(current.model)

  const [registeredIds, setRegisteredIds] = useState<ProviderId[]>([])
  const [instances, setInstances] = useState<ProviderInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(current.providerInstanceId ?? null)

  const [ollamaStatus, setOllamaStatus] = useState<CardStatus>("unknown")
  const [ollamaVerifying, setOllamaVerifying] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<ProviderModel[]>([])
  const [ollamaModelsLoading, setOllamaModelsLoading] = useState(false)

  const [openaiStatus, setOpenaiStatus] = useState<CardStatus>("unknown")
  const [openaiVerifying, setOpenaiVerifying] = useState(false)
  const [openaiModels, setOpenaiModels] = useState<ProviderModel[]>([])
  const [openaiModelsLoading, setOpenaiModelsLoading] = useState(false)
  const [openaiMessage, setOpenaiMessage] = useState<string | undefined>(undefined)

  const dialog = useInstanceDialog()

  useEffect(() => {
    onChange({ provider, providerInstanceId, model })
  }, [onChange, provider, providerInstanceId, model])

  const ollamaEnabled = registeredIds.includes("ollama")
  const openaiEnabled = registeredIds.includes("openai-compatible")

  const ollamaModel = model ?? ""
  const openaiModel = model ?? ""

  const verifyOllama = useCallback(async () => {
    setOllamaVerifying(true)
    setOllamaStatus("loading")
    try {
      const result = await validateProvider("ollama")
      setOllamaStatus(result.status)
      if (result.status === "available") {
        setOllamaModelsLoading(true)
        try {
          const r = await listProviderModels("ollama")
          setOllamaModels(r.models)
        } catch {
          setOllamaModels([])
        } finally {
          setOllamaModelsLoading(false)
        }
      }
    } catch {
      setOllamaStatus("unavailable")
    } finally {
      setOllamaVerifying(false)
    }
  }, [])

  const verifyOpenAIForInstance = useCallback(async (instanceId: string) => {
    setOpenaiVerifying(true)
    setOpenaiStatus("loading")
    setOpenaiMessage(undefined)
    try {
      const result = await validateProviderInstance(instanceId)
      const status = result.status
      setOpenaiStatus(status)
      setOpenaiMessage(result.message)
      if (status === "available") {
        setOpenaiModelsLoading(true)
        try {
          const r = await listProviderModels("openai-compatible", instanceId)
          setOpenaiModels(r.models)
        } catch {
          setOpenaiModels([])
        } finally {
          setOpenaiModelsLoading(false)
        }
      }
    } catch {
      setOpenaiStatus("unavailable")
    } finally {
      setOpenaiVerifying(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const [ids, insts] = await Promise.all([listProviders(), listProviderInstances()])
        setRegisteredIds(ids.map((p) => p.id))
        setInstances(insts)
        if (current.provider === "ollama") {
          void verifyOllama()
        } else if (current.provider === "openai-compatible" && current.providerInstanceId) {
          setSelectedInstanceId(current.providerInstanceId)
          void verifyOpenAIForInstance(current.providerInstanceId)
        }
      } catch {
        toast.error(t("settings.providersLoadFailed"))
      }
    })()
  }, [current.provider, current.providerInstanceId, verifyOllama, verifyOpenAIForInstance, t])

  const handleSelectProvider = useCallback((id: ProviderId | string) => {
    if (id === provider) return
    if (id === "ollama") {
      setProvider("ollama")
      setProviderInstanceId(null)
    } else {
      setProvider("openai-compatible")
      if (selectedInstanceId) {
        setProviderInstanceId(selectedInstanceId)
      } else {
        setProviderInstanceId(null)
      }
    }
    setModel(null)
    setOllamaStatus("unknown")
    setOllamaModels([])
    setOpenaiStatus("unknown")
    setOpenaiModels([])
    setOpenaiMessage(undefined)
    if (id === "ollama") {
      void verifyOllama()
    }
  }, [provider, selectedInstanceId, verifyOllama])

  const handleSelectInstance = useCallback((id: string) => {
    if (id === selectedInstanceId) return
    setSelectedInstanceId(id)
    setProviderInstanceId(id)
    setModel(null)
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
        setProviderInstanceId(instance.id)
        setModel(null)
        void verifyOpenAIForInstance(instance.id)
        dialog.close()
        toast.success(t("settings.instanceCreated"), { description: instance.name })
      } catch (e) {
        toast.error(t("settings.instanceCreateFailed"), { description: formatError(e) })
      }
    },
    [dialog, verifyOpenAIForInstance, t],
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
        toast.success(t("settings.instanceUpdated"))
      } catch (e) {
        toast.error(t("settings.instanceUpdateFailed"), { description: formatError(e) })
      }
    },
    [dialog, t],
  )

  const handleDeleteInstance = useCallback(
    async (id: string) => {
      try {
        await deleteProviderInstance(id)
        setInstances((prev) => prev.filter((i) => i.id !== id))
        if (selectedInstanceId === id) {
          setSelectedInstanceId(null)
          setProviderInstanceId(null)
        }
        toast.success(t("settings.instanceDeleted"))
      } catch (e) {
        toast.error(t("settings.instanceDeleteFailed"), { description: formatError(e) })
      }
    },
    [selectedInstanceId, t],
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
          status={ollamaStatus}
          verifying={ollamaVerifying}
          onVerify={() => void verifyOllama()}
          model={ollamaModel}
          models={ollamaModels}
          modelsLoading={ollamaModelsLoading}
          onModelChange={handleModelChange}
        />
      ) : (
        <ProviderCard
          providerId="openai-compatible"
          mode="local"
          status={openaiStatus}
          statusMessage={openaiMessage}
          verifying={openaiVerifying}
          onVerify={() => { if (selectedInstanceId) void verifyOpenAIForInstance(selectedInstanceId) }}
          verifyDisabled={!selectedInstanceId}
          model={openaiModel}
          models={openaiModels}
          modelsLoading={openaiModelsLoading}
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
