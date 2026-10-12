import { DownloadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { useInstallPrompt } from "@/lib/hooks/use-install-prompt"
import { useTranslation } from "@/lib/hooks/use-translation"

export interface InstallAppButtonProps {
  /** Extra classes for the button (the welcome stretches it full width). */
  buttonClassName?: string
}

/**
 * Install entry for the PWA: the native prompt when the browser captured it
 * (Chrome/Android) and a link to the tutorial on iOS, where the prompt never
 * fires. Renders nothing on desktop browsers without a prompt or once the app
 * runs installed.
 */
export function InstallAppButton({ buttonClassName }: InstallAppButtonProps) {
  const { t } = useTranslation()
  const { canPrompt, isIos, installed, promptInstall } = useInstallPrompt()

  if (installed || (!canPrompt && !isIos)) return null

  if (canPrompt) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={buttonClassName}
        onClick={() => void promptInstall()}
      >
        <DownloadIcon />
        {t("install.button")}
      </Button>
    )
  }

  return (
    <a
      href="/tutorials?t=pwa-install"
      className="text-center text-xs font-medium text-primary underline underline-offset-4"
    >
      {t("install.iosHint")}
    </a>
  )
}
