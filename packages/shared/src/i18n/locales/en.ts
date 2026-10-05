/**
 * Base dictionary. English is the default locale and the source of truth for
 * keys: every other locale must satisfy the same shape (checked at compile
 * time).
 */
export const en = {
  common: {
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    apply: "Apply",
    loading: "Loading…",
    unknownError: "Unknown error",
  },
  nav: {
    characters: "My characters",
    players: "Player characters",
    providers: "Providers",
    groupCharacters: "Characters",
    groupSystem: "System",
  },
  theme: {
    label: "Theme and appearance",
    theme: "Theme",
    mode: "Mode",
    default: "Default",
    forest: "Forest",
    ocean: "Ocean",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  language: {
    label: "Language",
    en: "English",
    es: "Spanish",
  },
  characters: {
    title: "My characters",
    count: { one: "1 character", other: "{count} characters" },
    create: "Create character",
    import: "Import character",
    searchLabel: "Search character",
    searchPlaceholder: "Search character…",
    sortLabel: "Sort by",
    sortRecencyDesc: "Newest first",
    sortRecencyAsc: "Oldest first",
    sortActivityDesc: "Last activity: newest",
    sortActivityAsc: "Last activity: oldest",
    results: { one: "1 result", other: "{count} results" },
    noResults: 'No characters match "{term}".',
    emptyTitle: "You have no characters",
    emptyDescription: "Create your first character to start a conversation.",
    deleted: "Character deleted.",
    deleteFailed: "The character could not be deleted.",
    conversationExists:
      "A conversation already exists for this character and version.",
    conversationCreateFailed: "The conversation could not be created.",
    providerUnavailable:
      "No AI provider is configured. The conversation was created, but it will not be able to reply until you configure one.",
    imported: 'Character "{name}" imported.',
    importFailed: "The character could not be imported.",
  },
  players: {
    title: "Player characters",
    subtitle:
      "Who you play. The AI will know it in the conversations where you pick one.",
    create: "Create persona",
    emptyTitle:
      "You have not created any persona yet. Create one so the AI knows who you are.",
    edit: "Edit",
    delete: "Delete",
    editTitle: "Edit persona",
    createTitle: "New persona",
    formDescription: "Name and description of your played character. No versions.",
    namePlaceholder: "Name",
    descriptionPlaceholder: "Description",
    required: "Name and description are required",
    saved: "Persona updated",
    created: "Persona created",
    saveFailed: "The persona could not be saved",
    deleted: "Persona deleted",
    deleteFailed: "The persona could not be deleted",
    loadFailed: "The player characters could not be loaded",
    deleteTitle: "Delete persona?",
    deleteDescription:
      'This will delete "{name}". Conversations using it will be left without a persona.',
  },
  errors: {
    PLAYER_CHARACTER_NOT_FOUND: "The selected persona no longer exists.",
    CHARACTER_NOT_FOUND: "The character no longer exists.",
    CONVERSATION_NOT_FOUND: "The conversation no longer exists.",
    CONVERSATION_ALREADY_EXISTS:
      "A conversation already exists for this character and version.",
    INVALID_IMPORT_FILE: "The file is not a valid character export.",
  },
} as const
