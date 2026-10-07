import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listProviders: vi.fn(),
  listProviderModels: vi.fn(),
  validateProvider: vi.fn(),
  listProviderInstances: vi.fn(),
  createProviderInstance: vi.fn(),
  updateProviderInstance: vi.fn(),
  deleteProviderInstance: vi.fn(),
  validateProviderInstance: vi.fn(),
}))

vi.mock("@/lib/api/providers", () => ({
  listProviders: mocks.listProviders,
  listProviderModels: mocks.listProviderModels,
  validateProvider: mocks.validateProvider,
}))

vi.mock("@/lib/api/provider-instances", () => ({
  listProviderInstances: mocks.listProviderInstances,
  createProviderInstance: mocks.createProviderInstance,
  updateProviderInstance: mocks.updateProviderInstance,
  deleteProviderInstance: mocks.deleteProviderInstance,
  validateProviderInstance: mocks.validateProviderInstance,
}))

import { OLLAMA_KEY, useProviderStore } from "./provider.store"

const instance = {
  id: "i1",
  kind: "openai-compatible",
  name: "A",
  url: "http://x",
} as never

beforeEach(() => {
  vi.clearAllMocks()
  useProviderStore.setState({ registeredIds: [], instances: [], runtimes: {} })
})

describe("useProviderStore", () => {
  it("loads the registered providers and the instances", async () => {
    mocks.listProviders.mockResolvedValue([
      { id: "ollama" },
      { id: "openai-compatible" },
    ])
    mocks.listProviderInstances.mockResolvedValue([instance])

    await useProviderStore.getState().load()

    expect(useProviderStore.getState().registeredIds).toEqual([
      "ollama",
      "openai-compatible",
    ])
    expect(useProviderStore.getState().instances).toEqual([instance])
  })

  it("verifies Ollama and stores its models", async () => {
    mocks.validateProvider.mockResolvedValue({ status: "available" })
    mocks.listProviderModels.mockResolvedValue({ models: [{ id: "m1" }] })

    const result = await useProviderStore.getState().verifyOllama()

    expect(result).toEqual({ ok: true, models: [{ id: "m1" }] })
    expect(useProviderStore.getState().runtimes[OLLAMA_KEY]).toMatchObject({
      status: "available",
      verifying: false,
      models: [{ id: "m1" }],
    })
  })

  it("marks the provider unavailable when the check fails", async () => {
    mocks.validateProvider.mockRejectedValue(new Error("boom"))

    const result = await useProviderStore.getState().verifyOllama()

    expect(result).toMatchObject({ ok: false, modelsFailed: false })
    expect(useProviderStore.getState().runtimes[OLLAMA_KEY]?.status).toBe(
      "unavailable",
    )
  })

  it("reports a models failure without dropping the connection", async () => {
    mocks.validateProvider.mockResolvedValue({ status: "available" })
    mocks.listProviderModels.mockRejectedValue(new Error("models down"))

    const result = await useProviderStore.getState().verifyOllama()

    expect(result).toMatchObject({ ok: false, modelsFailed: true })
    expect(useProviderStore.getState().runtimes[OLLAMA_KEY]?.status).toBe(
      "available",
    )
  })

  it("creates, updates and deletes instances", async () => {
    mocks.createProviderInstance.mockResolvedValue(instance)
    mocks.updateProviderInstance.mockResolvedValue({ ...instance, name: "B" })

    await useProviderStore.getState().createInstance({
      kind: "openai-compatible",
      name: "A",
      url: "http://x",
    })
    expect(useProviderStore.getState().instances).toHaveLength(1)

    await useProviderStore.getState().updateInstance("i1", { name: "B" })
    expect(useProviderStore.getState().instances[0]).toMatchObject({ name: "B" })

    useProviderStore.setState({
      runtimes: {
        i1: {
          status: "available",
          message: undefined,
          verifying: false,
          models: [],
          modelsLoading: false,
        },
      },
    })
    mocks.deleteProviderInstance.mockResolvedValue(undefined)
    await useProviderStore.getState().deleteInstance("i1")

    expect(useProviderStore.getState().instances).toHaveLength(0)
    expect(useProviderStore.getState().runtimes).toEqual({})
  })
})
