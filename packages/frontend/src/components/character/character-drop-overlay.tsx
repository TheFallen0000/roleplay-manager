import { useRef, useState } from "react"
import { UploadIcon } from "lucide-react"

import { useTranslation } from "@/lib/hooks/use-translation"

interface CharacterDropOverlayProps {
  onFile: (file: File) => void
  children: React.ReactNode
}

function hasFiles(event: React.DragEvent): boolean {
  return event.dataTransfer?.types?.includes("Files") ?? false
}

export function CharacterDropOverlay({
  onFile,
  children,
}: CharacterDropOverlayProps) {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  const counter = useRef(0)

  return (
    <div
      className="relative"
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        counter.current += 1
        setActive(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return
        counter.current = Math.max(0, counter.current - 1)
        if (counter.current === 0) {
          setActive(false)
        }
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        counter.current = 0
        setActive(false)
        const file = event.dataTransfer.files?.[0]
        if (file) {
          onFile(file)
        }
      }}
    >
      {children}
      {active ? (
        <div
          data-testid="character-drop-overlay"
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <UploadIcon className="size-10 text-primary" />
            <p className="text-lg font-semibold">{t("characters.dropHere")}</p>
            <p className="text-sm text-muted-foreground">
              {t("characters.dropHint")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
