import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { FieldDescription } from "@workspace/ui/components/field"
import { useTranslation } from "@/lib/hooks/use-translation"

interface InstanceFormDialogProps {
  open: boolean
  mode: "create" | "edit"
  initialName: string
  initialUrl: string
  initialApiKey: string
  onClose: () => void
  onSave: (name: string, url: string, apiKey: string) => void
}

export function InstanceFormDialog({
  open,
  mode,
  initialName,
  initialUrl,
  initialApiKey,
  onClose,
  onSave,
}: InstanceFormDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [url, setUrl] = useState(initialUrl)
  const [apiKey, setApiKey] = useState(initialApiKey)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      setName(initialName)
      setUrl(initialUrl)
      setApiKey(initialApiKey)
    }, 0)
    return () => clearTimeout(timer)
  }, [open, initialName, initialUrl, initialApiKey])

  const handleSave = () => {
    if (import.meta.env.DEV) {
      console.log("[InstanceFormDialog] Save clicked with:", { name, url, apiKey })
    }
    onSave(name, url, apiKey)
  }

  const title = mode === "create" ? t("providers.createInstanceTitle") : t("providers.editInstanceTitle")
  const description =
    mode === "create"
      ? t("providers.createInstanceDescription")
      : t("providers.editInstanceDescription")
  const apiKeyPlaceholder =
    mode === "create" ? "sk-..." : t("providers.apiKeyKeep")
  const saveLabel = mode === "create" ? t("providers.createInstanceAction") : t("common.saveChanges")
  const idPrefix = mode

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-name`}>{t("providers.nameLabel")}</FieldLabel>
            <Input
              id={`${idPrefix}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("providers.namePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-url`}>{t("providers.urlLabel")}</FieldLabel>
            <Input
              id={`${idPrefix}-url`}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:1234/v1"
            />
            <FieldDescription>
              {t("providers.urlHint")} <code>http://host:puerto/v1</code>.{" "}
              {t("providers.urlHintExample")} <code>http://localhost:1234/v1</code>.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-key`}>{t("providers.apiKeyLabel")} {mode === "edit" ? t("providers.apiKeyOptional") : ""}</FieldLabel>
            <Input
              id={`${idPrefix}-key`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyPlaceholder}
            />
          </Field>
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={handleSave}>{saveLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
