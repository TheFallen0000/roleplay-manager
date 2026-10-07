import { create } from "zustand"

import type {
  ProviderId,
  ProviderModel,
  ProviderStatus,
} from "@workspace/shared/types/provider"
import type {
  CreateProviderInstanceInput,
  ProviderInstance,
  UpdateProviderInstanceInput,
} from "@workspace/shared/types/provider-instance"

import {
  listProviderModels,
  listProviders,
  validateProvider,
} from "@/lib/api/providers"
import {
  createProviderInstance,
  deleteProviderInstance,
  listProviderInstances,
  updateProviderInstance,
  validateProviderInstance,
} from "@/lib/api/provider-instances"

/** Key used for the Ollama provider (it has no instance). */
export const OLLAMA_KEY = "ollama"

export type ProviderRuntimeStatus = ProviderStatus | "loading"

/** Verification/connection state of one provider or instance. */
export interface ProviderRuntimeState {
  status: ProviderRuntimeStatus
  message: string | undefined
  verifying: boolean
  models: ProviderModel[]
  modelsLoading: boolean
}

/**
 * Outcome of a verification, returned so each screen can show its own toasts
 * (the store never touches the UI).
 */
export type VerifyProviderResult =
  | { ok: true; models: ProviderModel[] }
  | { ok: false; message: string | undefined; modelsFailed: boolean }

export interface ProviderState {
  registeredIds: ProviderId[]
  instances: ProviderInstance[]
  /** Keyed by `OLLAMA_KEY` or the instance id. */
  runtimes: Record<string, ProviderRuntimeState>
  /** Loads the registered providers and the instances (shared by both screens). */
  load: () => Promise<void>
  createInstance: (
    input: CreateProviderInstanceInput,
  ) => Promise<ProviderInstance>
  updateInstance: (
    id: string,
    input: UpdateProviderInstanceInput,
  ) => Promise<ProviderInstance>
  deleteInstance: (id: string) => Promise<void>
  verifyOllama: () => Promise<VerifyProviderResult>
  verifyInstance: (id: string) => Promise<VerifyProviderResult>
}

/** Shared default so screens can render before the first verification. */
export const EMPTY_PROVIDER_RUNTIME: ProviderRuntimeState = {
  status: "unknown",
  message: undefined,
  verifying: false,
  models: [],
  modelsLoading: false,
}

const emptyRuntime = (): ProviderRuntimeState => EMPTY_PROVIDER_RUNTIME

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Provider instances and their connection state, shared by the chat's model
 * selector and the providers settings screen (one store per resource).
 */
export const useProviderStore = create<ProviderState>((set) => {
  const patchRuntime = (
    key: string,
    patch: Partial<ProviderRuntimeState>,
  ): void => {
    set((state) => ({
      runtimes: {
        ...state.runtimes,
        [key]: { ...(state.runtimes[key] ?? emptyRuntime()), ...patch },
      },
    }))
  }

  const verify = async (
    key: string,
    check: () => Promise<{ status: ProviderStatus; message?: string }>,
    loadModels: () => Promise<ProviderModel[]>,
  ): Promise<VerifyProviderResult> => {
    patchRuntime(key, { verifying: true, status: "loading", message: undefined })

    try {
      const result = await check()
      patchRuntime(key, {
        status: result.status,
        message: result.message,
        verifying: false,
      })
      if (result.status !== "available") {
        return { ok: false, message: result.message, modelsFailed: false }
      }

      patchRuntime(key, { modelsLoading: true })
      try {
        const models = await loadModels()
        patchRuntime(key, { models, modelsLoading: false })
        return { ok: true, models }
      } catch (error) {
        patchRuntime(key, { models: [], modelsLoading: false })
        return { ok: false, message: formatError(error), modelsFailed: true }
      }
    } catch (error) {
      const message = formatError(error)
      patchRuntime(key, { status: "unavailable", message, verifying: false })
      return { ok: false, message, modelsFailed: false }
    }
  }

  return {
    registeredIds: [],
    instances: [],
    runtimes: {},

    load: async () => {
      const [providers, instances] = await Promise.all([
        listProviders(),
        listProviderInstances(),
      ])
      set({ registeredIds: providers.map((provider) => provider.id), instances })
    },

    createInstance: async (input) => {
      const instance = await createProviderInstance(input)
      set((state) => ({ instances: [...state.instances, instance] }))
      return instance
    },

    updateInstance: async (id, input) => {
      const updated = await updateProviderInstance(id, input)
      set((state) => ({
        instances: state.instances.map((item) =>
          item.id === id ? updated : item,
        ),
      }))
      return updated
    },

    deleteInstance: async (id) => {
      await deleteProviderInstance(id)
      set((state) => {
        const { [id]: _removed, ...runtimes } = state.runtimes
        return {
          instances: state.instances.filter((item) => item.id !== id),
          runtimes,
        }
      })
    },

    verifyOllama: () =>
      verify(
        OLLAMA_KEY,
        () => validateProvider("ollama"),
        async () => (await listProviderModels("ollama")).models,
      ),

    verifyInstance: (id) =>
      verify(
        id,
        () => validateProviderInstance(id),
        async () => (await listProviderModels("openai-compatible", id)).models,
      ),
  }
})
