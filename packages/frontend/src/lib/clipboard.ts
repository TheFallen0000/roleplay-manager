/**
 * Copies text to the clipboard.
 *
 * The async Clipboard API requires a secure context (HTTPS or localhost), so
 * when the app is opened over plain HTTP (e.g. through the LAN URL) we fall
 * back to the legacy `execCommand("copy")` approach.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    textarea.remove()
    return copied
  } catch {
    return false
  }
}
