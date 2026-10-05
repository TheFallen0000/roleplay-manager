"use client"

import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@workspace/ui/components/dialog"
import { toast } from "@workspace/ui/components/sonner"
import { EyeIcon } from "lucide-react"
import { FieldSet } from "@workspace/ui/components/field"
import { useSummaryStore } from "@/lib/stores/summary.store"
import { useTranslation } from "@/lib/hooks/use-translation"
import { dateLocale } from "@/lib/locale"
import type { SummaryDTO } from "@workspace/shared/types/summary"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

interface SummaryViewerProps {
  conversationId: string
  summaryFrequency: number
}

type DialogMode = null | "view" | "edit" | "delete"

export function SummaryViewer({ conversationId, summaryFrequency }: SummaryViewerProps) {
  const { t, locale } = useTranslation()
  const summaries = useSummaryStore((s) => s.summaries)
  const loading = useSummaryStore((s) => s.loading)
  const loadSummaries = useSummaryStore((s) => s.loadSummaries)
  const generateSummary = useSummaryStore((s) => s.generateSummary)
  const updateSummary = useSummaryStore((s) => s.updateSummary)
  const deleteSummary = useSummaryStore((s) => s.deleteSummary)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadSummaries(conversationId)
  }, [conversationId, loadSummaries])

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [target, setTarget] = useState<SummaryDTO | null>(null)
  const [editContent, setEditContent] = useState("")

  const openView = (summary: SummaryDTO) => {
    setTarget(summary)
    setDialogMode("view")
  }

  const openEdit = (summary: SummaryDTO) => {
    setEditContent(summary.content)
    setTarget(summary)
    setDialogMode("edit")
  }

  const openDelete = (summary: SummaryDTO) => {
    setTarget(summary)
    setDialogMode("delete")
  }

  const sortedSummaries = [...summaries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateSummary(conversationId)
      if (result) {
        toast.success(t("summaries.generated"))
      } else {
        toast.error(t("summaries.generateFailed"))
      }
    } catch {
      toast.error(t("summaries.generateError"))
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!target) return
    if (!editContent.trim()) {
      toast.error(t("summaries.emptyContent"))
      return
    }
    try {
      await updateSummary(conversationId, target.id, editContent)
      toast.success(t("summaries.updated"))
      setDialogMode(null)
      setTarget(null)
      setEditContent("")
    } catch {
      toast.error(t("summaries.updateFailed"))
    }
  }

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteSummary(conversationId, target.id)
      toast.success(t("summaries.deleted"))
      setDialogMode(null)
      setTarget(null)
    } catch {
      toast.error(t("summaries.deleteFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <FieldSet>
        <Button onClick={handleGenerate} disabled={generating} className="self-end">
          {generating ? <Spinner /> : null}
          {t("summaries.generateNow")}
        </Button>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          {summaries.length === 0 ? (
            <Empty className="p-2">
              <EmptyHeader>
                <EmptyTitle>{t("summaries.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("summaries.emptyDescription", { count: summaryFrequency })}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            sortedSummaries.map((summary) => (
              <div key={summary.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(summary.createdAt).toLocaleDateString(dateLocale(locale), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {summary.model ? (
                    <Badge variant="secondary">{summary.model}</Badge>
                  ) : null}
                </div>
                <p className="text-sm whitespace-pre-wrap line-clamp-2">{summary.content}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(summary)}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDelete(summary)}>
                    {t("common.delete")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openView(summary)}
                    aria-label={t("summaries.viewFull")}
                    className="ml-auto"
                  >
                    <EyeIcon />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </FieldSet>

      <Dialog open={dialogMode === "view"} onOpenChange={(open) => { if (!open) { setDialogMode(null); setTarget(null) } }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("summaries.title")}</DialogTitle>
            {target ? (
              <DialogDescription>
                {new Date(target.createdAt).toLocaleDateString(dateLocale(locale), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{target?.content}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (target) {
                  setEditContent(target.content)
                  setDialogMode("edit")
                }
              }}
            >
              {t("common.edit")}
            </Button>
            <DialogClose render={<Button variant="outline">{t("summaries.close")}</Button>} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "edit"} onOpenChange={(open) => { if (!open) { setDialogMode(null); setTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("summaries.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("summaries.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className={"max-h-[55vh] "}>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={8}
          />
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
            <Button onClick={handleSaveEdit}>{t("common.saveChanges")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "delete"} onOpenChange={(open) => { if (!open) { setDialogMode(null); setTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("summaries.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("summaries.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
