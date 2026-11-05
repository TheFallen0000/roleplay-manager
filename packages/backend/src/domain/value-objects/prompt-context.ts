export interface PromptContextMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface PromptContext {
  systemPrompt: string
  messages: PromptContextMessage[]
}

export interface PromptContextSection {
  id: string
  source: "system"
  content: string
  reason: string
  itemCount?: number
}

export interface ToolFunctionDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolDefinition {
  type: "function"
  function: ToolFunctionDefinition
}

export type ToolChoice = "auto" | "none" | { type: "function"; function: { name: string } }

export interface GenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
  tools?: ToolDefinition[]
  toolChoice?: ToolChoice
}

export interface ToolCallDelta {
  index: number
  id?: string
  functionName?: string
  argumentsDelta?: string
}

export interface ToolCall {
  id: string
  functionName: string
  arguments: string
}

export interface StreamChunk {
  content?: string
  toolCalls?: ToolCallDelta[]
}
