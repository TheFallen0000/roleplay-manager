import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { TitleSource } from "@workspace/shared/types/conversation"

/** Shared SSE events emitted while a chat reply is generated. */
export interface StreamChunkEvent {
  type: "chunk"
  content: string
}

export interface CompactingEvent {
  type: "compacting"
}

export interface ContextWarningEvent {
  type: "context-warning"
  warning: { code: string; message: string }
}

export interface SummaryGeneratedEvent {
  type: "summary-generated"
  summary: SummaryDTO
}

export interface TitleGeneratedEvent {
  type: "title-generated"
  title: string
  titleSource: TitleSource
}

export interface StreamErrorEvent {
  type: "error"
  error: { code: string; message: string }
}

/** Events the engine emits while preparing the prompt. */
export type ChatContextEvent =
  | CompactingEvent
  | ContextWarningEvent
  | SummaryGeneratedEvent
