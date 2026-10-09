import OpenAI from "openai"

import type {
  ProviderModel,
  ProviderStatus,
} from "@workspace/shared/types/provider"

import {
  ProviderError,
  ProviderTimeoutError,
} from "../../primary/middlewares/error-handler"
import type { Logger } from "../../../../domain/ports/logger.port"
import type { ProviderPort } from "../../../../domain/ports/provider.port"
import type { GenerateOptions, PromptContext, StreamChunk } from "../../../../domain/value-objects/prompt-context"

export interface OpenAICompatibleAdapterOptions {
  baseUrl: string
  apiKey: string | null
  timeoutMs: number
  streamingTimeoutMs: number
  logger: Logger
}

/**
 * Adapter for any provider exposing the OpenAI API
 * (LM Studio, vLLM, Text Generation WebUI, OpenAI, Groq, etc.).
 *
 * Plain `fetch` is used for `listModels()` and `validateConnection()`
 * (the openai SDK does not expose the raw response correctly in v4.x).
 * Generation still uses `client.chat.completions.create` for streaming,
 * where the SDK is reliable.
 */
export class OpenAICompatibleAdapter implements ProviderPort {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly client: OpenAI

  constructor(private readonly options: OpenAICompatibleAdapterOptions) {
    this.baseUrl = this.normalizeBaseUrl(options.baseUrl, options.logger)
    this.apiKey = options.apiKey ?? "not-required"
    this.client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 0,
    })
  }

  private normalizeBaseUrl(url: string, logger: Logger): string {
    const trimmed = url.replace(/\/+$/, "")
    if (!/\/v1$/.test(trimmed)) {
      const normalized = `${trimmed}/v1`
      logger.info("OpenAI-compatible base URL does not end with /v1; appending it", {
        original: url,
        normalized,
      })
      return normalized
    }
    return trimmed
  }

  private async fetchWithTimeout(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
    const url = `${this.baseUrl}${path}`
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...init.headers,
        },
      })
      return response
    } finally {
      clearTimeout(timeout)
    }
  }

  async validateConnection(): Promise<ProviderStatus> {
    try {
      const response = await this.fetchWithTimeout("/models")
      return response.ok ? "available" : "unavailable"
    } catch (error) {
      return this.translateToUnavailable(error)
    }
  }

  async listModels(): Promise<{
    models: ProviderModel[]
    manualEntryRequired: boolean
  }> {
    try {
      const response = await this.fetchWithTimeout("/models")
      if (!response.ok) {
        const status = response.status
        if (status === 404 || status === 405 || status === 501) {
          this.options.logger.info(
            "Provider does not expose /v1/models; falling back to manual entry",
            { status },
          )
          return { models: [], manualEntryRequired: true }
        }
        throw new ProviderError(
          "PROVIDER_CONNECTION_FAILED",
          `Failed to list OpenAI-compatible models: HTTP ${status}`,
        )
      }
      const body = (await response.json()) as Record<string, unknown>
      const raw = (body.data ?? body.models ?? []) as Array<unknown>
      const models: ProviderModel[] = raw.map((m) => {
        if (typeof m === "string") {
          return { id: m, name: m }
        }
        const obj = m as Record<string, string>
        const id = obj.id ?? obj.key ?? obj.name ?? obj.display_name
        if (!id) {
          this.options.logger.warn("OpenAI-compatible model entry missing identifier", { entry: m })
          return { id: String(m), name: String(m) }
        }
        const name = obj.display_name ?? obj.name ?? id
        return { id, name }
      })
      return { models, manualEntryRequired: false }
    } catch (error) {
      const status = this.errorStatus(error)
      if (status === 404 || status === 405 || status === 501) {
        this.options.logger.info(
          "Provider does not expose /v1/models; falling back to manual entry",
          { status },
        )
        return { models: [], manualEntryRequired: true }
      }
      if (error instanceof ProviderError) throw error
      if (error instanceof ProviderTimeoutError) throw error
      throw new ProviderError(
        "PROVIDER_CONNECTION_FAILED",
        `Failed to list OpenAI-compatible models: ${(error as Error).message}`,
      )
    }
  }

  private translateToUnavailable(error: unknown): ProviderStatus {
    if (error instanceof ProviderTimeoutError) {
      this.options.logger.warn("OpenAI-compatible timed out")
      return "unavailable"
    }
    this.options.logger.warn(
      "OpenAI-compatible connection failed",
      { message: (error as Error).message },
    )
    return "unavailable"
  }

  private errorStatus(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) return undefined
    const e = error as { status?: number; response?: { status?: number } }
    return e.status ?? e.response?.status
  }

  async *generateStreaming(
    context: PromptContext,
    options?: GenerateOptions,
  ): AsyncIterable<StreamChunk> {
    const model = options?.model ?? "gpt-4o-mini"

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: context.systemPrompt },
      ...context.messages,
    ]

    const hasTools = !!(options?.tools && options.tools.length > 0)

    const stream = await this.client.chat.completions.create({
      model: model as string,
      messages,
      stream: true,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences,
      ...(hasTools
        ? { tools: options!.tools, tool_choice: options!.toolChoice ?? "auto" }
        : {}),
    })

    try {
      for await (const chunk of stream as AsyncIterable<{
        choices?: Array<{
          delta?: {
            content?: string | null
            tool_calls?: Array<{
              index: number
              id?: string
              function?: { name?: string; arguments?: string }
            }>
          }
        }>
      }>) {
        const choice = chunk.choices?.[0]
        const delta = choice?.delta
        if (!delta) continue

        const content = delta.content ?? undefined
        const toolCallDeltas = delta.tool_calls?.map((tc) => ({
          index: tc.index,
          id: tc.id,
          functionName: tc.function?.name,
          argumentsDelta: tc.function?.arguments,
        }))

        if (content || (toolCallDeltas && toolCallDeltas.length > 0)) {
          yield {
            content,
            toolCalls: toolCallDeltas && toolCallDeltas.length > 0 ? toolCallDeltas : undefined,
          }
        }
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error
      const message = (error as Error).message
      const status = this.errorStatus(error)
      if (status === 404) {
        this.options.logger.error(
          "OpenAI-compatible chat completions endpoint returned 404. " +
          "Verify the base URL points to the root of the OpenAI-compatible API " +
          "(e.g. http://localhost:1234/v1) and that the path ends with /v1.",
          undefined,
          { baseUrl: this.baseUrl, status },
        )
        throw new ProviderError(
          "PROVIDER_CONNECTION_FAILED",
          `Chat completions endpoint returned 404. ` +
          `Verify the base URL is correct: "${this.baseUrl}". ` +
          `Expected format: http://host:port/v1, received: http://host:port${this.baseUrl.match(/\/\/[^/]+(.+)/)?.[1] ?? ""}`,
        )
      }
      throw new ProviderError(
        "PROVIDER_GENERATION_FAILED",
        `OpenAI-compatible streaming failed: ${message}`,
      )
    }
  }
}
