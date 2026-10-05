import type { PromptContextDTO } from "@workspace/shared/types/context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { FileText, User, Bot, Info } from "lucide-react"

import { useTranslation } from "@/lib/hooks/use-translation"

interface ContextPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: PromptContextDTO | null
  onSend: () => void
  loading?: boolean
}

export function ContextPreviewDialog({
  open,
  onOpenChange,
  context,
  onSend,
  loading = false,
}: ContextPreviewDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("chat.previewTitle")}</DialogTitle>
        </DialogHeader>

        {context && (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Info className="size-3" />
              <span>
                {context.metadata.characterName} v
                {context.metadata.characterVersion}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span>
                {t("chat.previewMetaMessages", {
                  count: context.metadata.totalContextMessages,
                })}{" "}
                ·{" "}
                {t("chat.previewMetaCharacters", {
                  count: context.metadata.totalCharacters,
                })}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span>
                {t("chat.previewMetaRecent", {
                  count: context.metadata.recentMessageCount,
                })}
              </span>
              {context.metadata.summaryId && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("chat.previewWithSummary")}
                  </Badge>
                </>
              )}
              {context.metadata.memoryCount > 0 && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("chat.previewMemories", {
                      count: context.metadata.memoryCount,
                    })}
                  </Badge>
                </>
              )}
            </div>

            <Separator />

            <div className="flex-1 overflow-y-auto pr-1">
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <FileText className="size-3" />
                System Prompt
              </h4>
              <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {context.systemPrompt}
              </pre>

              <Separator />

              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {t("chat.previewMessagesTitle", {
                    count: context.messages.length,
                  })}
                </h4>
                <div className="space-y-2">
                  {context.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 rounded-md border p-2.5 text-xs ${
                        msg.role === "system"
                          ? "border-muted bg-muted/30"
                          : msg.role === "user"
                            ? "border-primary/20 bg-primary/5"
                            : "border-secondary/20 bg-secondary/5"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {msg.role === "user" ? (
                          <User className="size-3.5 text-primary" />
                        ) : msg.role === "assistant" ? (
                          <Bot className="size-3.5 text-secondary-foreground" />
                        ) : (
                          <FileText className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="mb-0.5 block font-medium text-muted-foreground capitalize">
                          {msg.role}
                        </span>
                        <pre className="leading-relaxed whitespace-pre-wrap text-foreground">
                          {msg.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={onSend} disabled={loading}>
                {loading ? t("chat.previewSending") : t("chat.previewSend")}
              </Button>
            </div>
          </div>
        )}

        {!context && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {loading ? t("chat.previewLoading") : t("chat.previewEmpty")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
