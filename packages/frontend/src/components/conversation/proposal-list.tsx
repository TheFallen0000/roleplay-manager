"use client"

import { useEffect, useMemo, useState } from "react"
import { Field, FieldGroup, FieldLegend, FieldSet } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Empty, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { toast } from "@workspace/ui/components/sonner"
import { useMemoryStore } from "@/lib/stores/memory.store"
import { useTranslation } from "@/lib/hooks/use-translation"
import type { MemoryChangeProposalDTO } from "@workspace/shared/types/memory-change-proposal"

import { ProposalCard } from "./proposal-card"

interface ProposalListProps {
  conversationId: string
}

interface ProposalOverrides {
  actor?: string
  title?: string
  description?: string
  priority?: number
}

export function ProposalList({ conversationId }: ProposalListProps) {
  const { t } = useTranslation()
  const proposals = useMemoryStore((s) => s.proposals)
  const memories = useMemoryStore((s) => s.memories)
  const loading = useMemoryStore((s) => s.loading)
  const applyProposals = useMemoryStore((s) => s.applyProposals)
  const loadMemories = useMemoryStore((s) => s.loadMemories)
  const loadProposals = useMemoryStore((s) => s.loadProposals)

  useEffect(() => {
    loadProposals(conversationId)
    loadMemories(conversationId)
  }, [conversationId, loadMemories, loadProposals])

  const memoriesById = useMemo(
    () => new Map(memories.map((memory) => [memory.id, memory])),
    [memories],
  )

  const targetOf = (proposal: MemoryChangeProposalDTO) =>
    proposal.targetMemoryId
      ? memoriesById.get(proposal.targetMemoryId) ?? null
      : null

  const [editingProposal, setEditingProposal] =
    useState<MemoryChangeProposalDTO | null>(null)
  const [deleteProposal, setDeleteProposal] =
    useState<MemoryChangeProposalDTO | null>(null)
  const [confirmingApplyAll, setConfirmingApplyAll] = useState(false)
  const [actor, setActor] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState(5)

  const pendingProposals = proposals.filter((p) => p.status === "pending")
  const pendingDeletes = pendingProposals.filter(
    (p) => p.operation === "DELETE",
  )
  const editingTarget = editingProposal ? targetOf(editingProposal) : null
  const deleteTarget = deleteProposal ? targetOf(deleteProposal) : null

  const applyOne = async (
    proposal: MemoryChangeProposalDTO,
    overrides?: ProposalOverrides,
    successMessage = t("memory.applied"),
  ) => {
    try {
      await applyProposals(conversationId, [
        { proposalId: proposal.id, action: "apply", overrides },
      ])
      await loadMemories(conversationId)
      toast.success(successMessage)
    } catch {
      toast.error(t("memory.applyFailed"))
    }
  }

  const handleAccept = (proposal: MemoryChangeProposalDTO) => {
    if (proposal.operation === "DELETE") {
      setDeleteProposal(proposal)
      return
    }
    void applyOne(proposal)
  }

  const confirmDelete = async () => {
    if (!deleteProposal) return
    const proposal = deleteProposal
    setDeleteProposal(null)
    await applyOne(proposal)
  }

  const applyAll = async () => {
    try {
      await applyProposals(
        conversationId,
        pendingProposals.map((proposal) => ({
          proposalId: proposal.id,
          action: "apply" as const,
        })),
      )
      await loadMemories(conversationId)
      toast.success(t("memory.appliedAll"))
    } catch {
      toast.error(t("memory.applyAllFailed"))
    }
  }

  const handleApplyAll = () => {
    if (pendingDeletes.length > 0) {
      setConfirmingApplyAll(true)
      return
    }
    void applyAll()
  }

  const confirmApplyAll = async () => {
    setConfirmingApplyAll(false)
    await applyAll()
  }

  const handleDiscard = async (proposal: MemoryChangeProposalDTO) => {
    try {
      await applyProposals(conversationId, [
        { proposalId: proposal.id, action: "discard" },
      ])
      toast.success(t("memory.discarded"))
    } catch {
      toast.error(t("memory.discardFailed"))
    }
  }

  const openEdit = (proposal: MemoryChangeProposalDTO) => {
    setActor(proposal.actor)
    setTitle(proposal.title)
    setDescription(proposal.description)
    setPriority(proposal.priority)
    setEditingProposal(proposal)
  }

  const handleEditSubmit = async () => {
    if (!editingProposal) return
    if (!actor.trim() || !title.trim()) {
      toast.error(t("memory.proposalInvalidFields"))
      return
    }
    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      toast.error(t("memory.proposalInvalidPriority"))
      return
    }
    if (
      editingProposal.operation === "UPDATE" &&
      editingTarget &&
      actor === editingTarget.actor &&
      title === editingTarget.title &&
      description === editingTarget.description &&
      priority === editingTarget.priority
    ) {
      toast.info(t("memory.proposalNoChanges"))
      return
    }
    const proposal = editingProposal
    setEditingProposal(null)
    await applyOne(
      proposal,
      { actor, title, description, priority },
      t("memory.appliedWithChanges"),
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (pendingProposals.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("memory.proposalsEmpty")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <FieldSet>
        <FieldLegend>{t("memory.proposalsTitle")}</FieldLegend>
        <p className="text-xs text-muted-foreground">
          {t("memory.priorityHelp")}
        </p>
        {pendingProposals.length > 1 ? (
          <Button onClick={handleApplyAll} className="self-start">
            {t("memory.acceptAll")}
          </Button>
        ) : null}
        <div className="flex flex-col gap-3">
          {pendingProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              target={targetOf(proposal)}
              onAccept={() => handleAccept(proposal)}
              onEdit={() => openEdit(proposal)}
              onDiscard={() => handleDiscard(proposal)}
            />
          ))}
        </div>
      </FieldSet>

      <Dialog
        open={!!editingProposal}
        onOpenChange={(open) => {
          if (!open) setEditingProposal(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memory.editProposalTitle")}</DialogTitle>
            <DialogDescription>
              {t("memory.editProposalDescription")}
            </DialogDescription>
          </DialogHeader>
          {editingTarget ? (
            <div className="rounded-md bg-muted p-2 text-xs">
              <p className="font-medium">{t("memory.proposalCurrent")}</p>
              <p>
                {editingTarget.actor} — {editingTarget.title}
              </p>
              <p className="text-muted-foreground">
                {editingTarget.description}
              </p>
              <p>
                {t("memory.priority", { priority: editingTarget.priority })}
              </p>
            </div>
          ) : null}
          <FieldGroup>
            <Field>
              <Label htmlFor="edit-actor">{t("memory.actor")}</Label>
              <Input
                id="edit-actor"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-title">{t("memory.title")}</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-description">{t("memory.description")}</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-priority">
                {t("memory.priorityLabel")}
              </Label>
              <Input
                id="edit-priority"
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline">{t("common.cancel")}</Button>}
            />
            <Button onClick={handleEditSubmit}>
              {t("memory.acceptChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteProposal}
        onOpenChange={(open) => {
          if (!open) setDeleteProposal(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memory.proposalDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("memory.proposalDeleteDescription")}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="rounded-lg border border-destructive/40 p-3 text-sm">
              <p className="font-semibold">
                {deleteTarget.actor} — {deleteTarget.title}
              </p>
              <p className="text-muted-foreground">
                {deleteTarget.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("memory.priority", { priority: deleteTarget.priority })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive">
              {t("memory.proposalTargetMissing")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline">{t("common.cancel")}</Button>}
            />
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!deleteTarget}
            >
              {t("memory.proposalDeleteConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingApplyAll} onOpenChange={setConfirmingApplyAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memory.proposalAcceptAllTitle")}</DialogTitle>
            <DialogDescription>
              {t("memory.proposalAcceptAllDescription", {
                count: pendingProposals.length,
                deletes: pendingDeletes.length,
              })}
            </DialogDescription>
          </DialogHeader>
          {pendingDeletes.length > 0 ? (
            <>
              <p className="text-sm font-medium">
                {t("memory.proposalAcceptAllWithDeletes")}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {pendingDeletes.map((proposal) => {
                  const target = targetOf(proposal)
                  return (
                    <li key={proposal.id} className="rounded-md border p-2">
                      <span className="font-semibold">
                        {target?.title ?? proposal.title}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {target?.actor ?? proposal.actor}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline">{t("common.cancel")}</Button>}
            />
            <Button onClick={confirmApplyAll}>{t("memory.acceptAll")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
