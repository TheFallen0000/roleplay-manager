export interface DialogueColorDefinition {
  value: string
  labelKey:
    | "settings.dialogueColorViolet"
    | "settings.dialogueColorSakura"
    | "settings.dialogueColorOcean"
    | "settings.dialogueColorMatcha"
    | "settings.dialogueColorAmber"
    | "settings.dialogueColorRed"
}

/** Mid-tone palette that reads on both the paper and the ink grounds. */
export const DIALOGUE_COLORS: DialogueColorDefinition[] = [
  { value: "#7c3aed", labelKey: "settings.dialogueColorViolet" },
  { value: "#db2777", labelKey: "settings.dialogueColorSakura" },
  { value: "#0284c7", labelKey: "settings.dialogueColorOcean" },
  { value: "#059669", labelKey: "settings.dialogueColorMatcha" },
  { value: "#d97706", labelKey: "settings.dialogueColorAmber" },
  { value: "#dc2626", labelKey: "settings.dialogueColorRed" },
]
