"use client"

import { useEffect, useState } from "react"
import { FieldSet } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Spinner } from "@workspace/ui/components/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { toast } from "@workspace/ui/components/sonner"
import { useMemoryStore } from "@/lib/stores/memory.store"
import { useChatStore } from "@/lib/stores/chat.store"
import { useTranslation } from "@/lib/hooks/use-translation"
import { memoryDecayInfo } from "@/lib/format-memory"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemoryDTO } from "@workspace/shared/types/memory"

interface MemoryListProps {
  conversationId: string
  conversation: ConversationDetail
}

type DialogMode = null | "create" | "edit" | "delete"

export function MemoryList({ conversationId, conversation }: MemoryListProps) {
  const { t } = useTranslation()
  const memories = useMemoryStore((s) => s.memories)
  const loading = useMemoryStore((s) => s.loading)
  const lastDecay = useMemoryStore((s) => s.lastDecay)
  const createMemory = useMemoryStore((s) => s.createMemory)
  const updateMemory = useMemoryStore((s) => s.updateMemory)
  const deleteMemory = useMemoryStore((s) => s.deleteMemory)
  const loadMemories = useMemoryStore((s) => s.loadMemories)
  const chatMessages = useChatStore((s) => s.messages)
  const messageCount = chatMessages.length

  useEffect(() => {
    loadMemories(conversationId)
  }, [conversationId, loadMemories, messageCount])

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [target, setTarget] = useState<MemoryDTO | null>(null)
  const [actor, setActor] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState(5)

  const resetForm = () => {
    setActor("")
    setTitle("")
    setDescription("")
    setPriority(5)
    setTarget(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogMode("create")
  }

  const openEdit = (memory: MemoryDTO) => {
    setActor(memory.actor)
    setTitle(memory.title)
    setDescription(memory.description)
    setPriority(memory.priority)
    setTarget(memory)
    setDialogMode("edit")
  }

  const openDelete = (memory: MemoryDTO) => {
    setTarget(memory)
    setDialogMode("delete")
  }

  const handleCreate = async () => {
    if (!actor.trim() || !title.trim() || !description.trim()) {
      toast.error(t("memory.requiredFields"))
      return
    }
    try {
      await createMemory(conversationId, { actor, title, description, priority })
      toast.success(t("memory.created"))
      setDialogMode(null)
      resetForm()
    } catch {
      toast.error(t("memory.createFailed"))
    }
  }

  const handleEdit = async () => {
    if (!target) return
    try {
      await updateMemory(conversationId, target.id, { actor, title, description, priority })
      toast.success(t("memory.updated"))
      setDialogMode(null)
      resetForm()
    } catch {
      toast.error(t("memory.updateFailed"))
    }
  }

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteMemory(conversationId, target.id)
      toast.success(t("memory.deleted"))
      setDialogMode(null)
      resetForm()
    } catch {
      toast.error(t("memory.deleteFailed"))
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
        <Button onClick={openCreate} className="self-end mt-2">{t("memory.create")}</Button>
        {lastDecay ? (
          <p className="text-xs text-muted-foreground">
            {t("memory.lastDecay", {
              date: new Date(lastDecay.at).toLocaleString(),
              count: lastDecay.deleted,
            })}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {memories.length === 0 ? (
            <Empty className="p-2">
              <EmptyHeader>
                <EmptyTitle>{t("memory.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("memory.emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            memories.map((memory) => {
              const info = memoryDecayInfo(memory, conversation, chatMessages)
              const badgeVariant =
                info.isDeletionCandidate
                  ? "destructive"
                  : info.isPromptEligible
                    ? "outline"
                    : "secondary"
              const badgeTitle = info.hasDecayed
                ? t("memory.priorityDecayed", {
                    stored: memory.priority,
                    effective: info.effectivePriority,
                    count: info.turns,
                  })
                : t("memory.priority", { priority: info.effectivePriority })
              return (
                <div key={memory.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{memory.actor}</span>
                    <Badge variant={badgeVariant} title={badgeTitle}>
                      {info.effectivePriority}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">{memory.title}</span>
                  <p className="text-sm text-muted-foreground">{memory.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(memory)}>{t("common.edit")}</Button>
                    <Button size="sm" variant="destructive" onClick={() => openDelete(memory)}>{t("common.delete")}</Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </FieldSet>

      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={(open) => { if (!open) { setDialogMode(null); resetForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t("memory.createTitle") : t("memory.editTitle")}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? t("memory.createDescription")
                : t("memory.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="memory-actor">{t("memory.actor")}</Label>
              <Input id="memory-actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder={t("memory.actorPlaceholder")} />
            </Field>
            <Field>
              <Label htmlFor="memory-title">{t("memory.title")}</Label>
              <Input id="memory-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("memory.titlePlaceholder")} />
            </Field>
            <Field>
              <Label htmlFor="memory-description">{t("memory.description")}</Label>
              <Textarea id="memory-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("memory.descriptionPlaceholder")} />
            </Field>
            <Field>
              <Label htmlFor="memory-priority">{t("memory.priorityLabel")}</Label>
              <Input id="memory-priority" type="number" min={1} max={10} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
            <Button onClick={dialogMode === "create" ? handleCreate : handleEdit}>
              {dialogMode === "create" ? t("common.create") : t("common.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "delete"} onOpenChange={(open) => { if (!open) { setDialogMode(null); resetForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memory.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("memory.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          {target && (
            <div className="rounded-lg border p-3 text-sm">
              <p><strong>{target.actor}</strong>: {target.title}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
