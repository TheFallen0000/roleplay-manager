import type {
  CreateLorebookEntryInput,
  CreateLorebookInput,
  UpdateLorebookInput,
} from "@workspace/shared/types/lorebook"

/**
 * Backend lorebook entry input: the shared wire shape plus the optional
 * normalized labels the API already accepts (S132 entry schema).
 */
export interface LorebookEntryInput extends CreateLorebookEntryInput {
  name?: string | null
  sourceId?: string | null
}

export interface CreateLorebookRequest
  extends Omit<CreateLorebookInput, "entries"> {
  entries?: LorebookEntryInput[]
}

export interface UpdateLorebookRequest
  extends Omit<UpdateLorebookInput, "entries"> {
  entries?: LorebookEntryInput[]
}
