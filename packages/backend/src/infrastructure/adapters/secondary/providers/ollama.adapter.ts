import type { ProviderModel, ProviderStatus } from "@workspace/shared/types/provider"

import {
  ProviderError,
  ProviderTimeoutError,
} from "../../primary/middlewares/error-handler"
import type { Logger } from "../../../../domain/ports/logger.port"
import type { ProviderPort } from "../../../../domain/ports/provider.port"
import type { GenerateOptions, PromptContext, StreamChunk } from "../../../../domain/value-objects/prompt-context"

export interface OllamaAdapterOptions {
  baseUrl: string
  timeoutMs: number
  streamingTimeoutMs: number
  logger: Logger
}

/**
 * Adapter for a local Ollama instance (HTTP against `/api/tags`).
 *
 * As of S1 it only implements `validateConnection` and `listModels`. Response
 * generation arrives in S4 with its own adapter that translates
 * `PromptContext` into Ollama's `/api/chat` format.
 */
export class OllamaAdapter implements ProviderPort {
  constructor(private readonly options: OllamaAdapterOptions) {}

  private get baseUrl(): string {
    return this.options.baseUrl.replace(/\/+$/, "")
  }

  private async fetchWithTimeout(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs,
    )
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new ProviderTimeoutError(
          `Ollama did not respond within ${this.options.timeoutMs}ms.`,
        )
      }
      throw new ProviderError(
        "PROVIDER_CONNECTION_FAILED",
        `Could not reach Ollama: ${(error as Error).message}`,
      )
    } finally {
      clearTimeout(timer)
    }
  }

  private toOllamaMessages(context: PromptContext): Array<{ role: string; content: string }> {
    return [
      { role: "system", content: context.systemPrompt },
      ...context.messages.map((m) => ({ role: m.role, content: m.content })),
    ]
  }

  private toOllamaOptions(options?: GenerateOptions): Record<string, unknown> {
    const opts: Record<string, unknown> = {}
    if (options?.temperature !== undefined) opts.temperature = options.temperature
    if (options?.maxTokens !== undefined) opts.num_predict = options.maxTokens
    if (options?.topP !== undefined) opts.top_p = options.topP
    if (options?.frequencyPenalty !== undefined) opts.frequency_penalty = options.frequencyPenalty
    if (options?.presencePenalty !== undefined) opts.presence_penalty = options.presencePenalty
    if (options?.stopSequences !== undefined && options.stopSequences.length > 0) opts.stop = options.stopSequences
    return opts
  }

  async validateConnection(): Promise<ProviderStatus> {
    try {
      const response = await this.fetchWithTimeout("/api/tags", {
        method: "GET",
      })
      if (response.ok) return "available"
      this.options.logger.warn("Ollama responded with non-OK status", {
        status: response.status,
      })
      return "unavailable"
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        this.options.logger.warn("Ollama timed out on validateConnection")
        return "unavailable"
      }
      this.options.logger.warn(
        "Ollama connection failed",
        { message: (error as Error).message },
      )
      return "unavailable"
    }
  }

  async listModels(): Promise<{
    models: ProviderModel[]
    manualEntryRequired: boolean
  }> {
    try {
      const response = await this.fetchWithTimeout("/api/tags", {
        method: "GET",
      })
      if (!response.ok) {
        throw new ProviderError(
          "PROVIDER_CONNECTION_FAILED",
          `Ollama /api/tags returned ${response.status}`,
        )
      }
      const body = (await response.json()) as {
        models?: Array<{ name: string }>
      }
      const models: ProviderModel[] = (body.models ?? []).map((m) => ({
        id: m.name,
        name: m.name,
      }))
      return { models, manualEntryRequired: false }
    } catch (error) {
      if (error instanceof ProviderTimeoutError) throw error
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        "PROVIDER_CONNECTION_FAILED",
        `Failed to list Ollama models: ${(error as Error).message}`,
      )
    }
  }

  async *generateStreaming(
    context: PromptContext,
    options?: GenerateOptions,
  ): AsyncIterable<StreamChunk> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      this.options.streamingTimeoutMs,
    )

    const body: Record<string, unknown> = {
      model: options?.model ?? "llama3",
      messages: this.toOllamaMessages(context),
      stream: true,
      options: this.toOllamaOptions(options),
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new ProviderError(
          "PROVIDER_GENERATION_FAILED",
          `Ollama /api/chat returned ${response.status}: ${text}`,
        )
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new ProviderError(
          "PROVIDER_GENERATION_FAILED",
          "Ollama returned no response body.",
        )
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed = JSON.parse(trimmed) as {
              message?: {
                content?: string
                tool_calls?: Array<{
                  id?: string
                  function?: { name?: string; arguments?: unknown }
                }>
              }
              done?: boolean
              error?: string
            }

            if (parsed.error) {
              throw new ProviderError(
                "PROVIDER_GENERATION_FAILED",
                parsed.error,
              )
            }

            const content = parsed.message?.content ?? undefined
            const rawToolCalls = parsed.message?.tool_calls
            const toolCalls = rawToolCalls
              ?.map((tc, idx) => ({
                index: idx,
                id: tc.id,
                functionName: tc.function?.name,
                argumentsDelta:
                  typeof tc.function?.arguments === "string"
                    ? tc.function.arguments
                    : tc.function?.arguments !== undefined
                      ? JSON.stringify(tc.function.arguments)
                      : undefined,
              }))
              .filter(
                (tc) =>
                  tc.id !== undefined ||
                  tc.functionName !== undefined ||
                  tc.argumentsDelta !== undefined,
              )

            if (
              content ||
              (toolCalls && toolCalls.length > 0)
            ) {
              yield {
                content,
                toolCalls:
                  toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
              }
            }
          } catch (error) {
            if (error instanceof ProviderError) throw error
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new ProviderTimeoutError(
          `Ollama streaming did not respond within ${this.options.streamingTimeoutMs}ms.`,
        )
      }
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        "PROVIDER_GENERATION_FAILED",
        `Ollama streaming failed: ${(error as Error).message}`,
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
