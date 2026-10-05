import { useState, type ReactElement } from "react"
import { toast } from "@workspace/ui/components/sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { BookOpenTextIcon, CpuIcon, PaletteIcon, SettingsIcon, UserRoundIcon } from "lucide-react"

import type { ConversationDetail, ConversationSettingsUpdate, MemoryProposalMode } from "@workspace/shared/types/conversation"
import type { ProviderId } from "@workspace/shared/types/provider"

import { updateConversationSettings } from "@/lib/api/conversations"
import { ApiClientError } from "@/lib/api/client"
import { useMemoryStore } from "@/lib/stores/memory.store"
import { useSummaryStore } from "@/lib/stores/summary.store"
import { SummaryViewer } from "../summary/summary-viewer"
import { InferenceParamsCard } from "./inference-params-card"
import { SummarySettingsCard } from "./summary-settings-card"
import { MemoryModeCard } from "../memory/memory-mode-card"
import { MemoryDecayCard } from "../memory/memory-decay-card"
import { ProposalList } from "../memory/proposal-list"
import { MemoryList } from "../memory/memory-list"
import { usePersistedStringList } from "@/lib/hooks/use-persisted-string-list"
import { useTranslation } from "@/lib/hooks/use-translation"
import { ModelSelector } from "./model-selector"
import { CustomizationTab } from "./customization-tab"
import { PlayerCharacterCard } from "./player-character-card"

type SettingsSection = "historia" | "modelo" | "personalizacion" | "persona"

interface SettingsPanelProps {
  conversationId: string
  current: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
  children?: React.ReactNode
}

interface ActionsFooterProps {
  hasChanges: boolean
  saving: boolean
  onSave: () => void
  onReset: () => void
}

function ActionsFooter({ hasChanges, saving, onSave, onReset }: ActionsFooterProps) {
  const { t } = useTranslation()

  return (
    <DialogFooter>
      <Button variant="outline" onClick={onReset} disabled={saving}>
        {t("settings.resetFooter")}
      </Button>
      <Button onClick={onSave} disabled={!hasChanges || saving}>
        {saving ? <Spinner /> : null}
        {t("settings.apply")}
      </Button>
    </DialogFooter>
  )
}

export function SettingsPanel({
  conversationId,
  current,
  onSettingsChanged,
  children,
}: SettingsPanelProps) {
  const { t } = useTranslation()
  const [section, setSection] = useState<SettingsSection | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<SettingsSection | null>(null)

  const [modelUpdate, setModelUpdate] = useState<{
    provider: ProviderId | string | null
    providerInstanceId: string | null
    model: string | null
  }>({
    provider: current.provider ?? "ollama",
    providerInstanceId: current.providerInstanceId ?? null,
    model: current.model,
  })
  const [temperature, setTemperature] = useState(current.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(current.maxTokens ?? 2048)
  const [topP, setTopP] = useState(current.topP ?? 0.9)
  const [frequencyPenalty, setFrequencyPenalty] = useState(current.frequencyPenalty ?? 0)
  const [presencePenalty, setPresencePenalty] = useState(current.presencePenalty ?? 0)
  const [stopSequences, setStopSequences] = useState(current.stopSequences?.join(", ") ?? "")
  const [recentMessageCount, setRecentMessageCount] = useState(current.recentMessageCount ?? 10)
  const [summaryFrequency, setSummaryFrequency] = useState(current.summaryFrequency ?? 20)

  const [saving, setSaving] = useState(false)

  const pendingCount = useMemoryStore((s) => s.proposals.filter((p) => p.status === "pending").length)
  const summaryCount = useSummaryStore((s) => s.summaries.length)

  const [openSections, setOpenSections] = usePersistedStringList({
    scope: conversationId,
    key: "settings-accordion",
    defaultValue: [],
    validateItem: (v) => v === "mode" || v === "proposals" || v === "memories" || v === "summaries" || v === "decay",
  })

  const isModeloDefaults =
    temperature === 0.7 && maxTokens === 2048 && topP === 0.9 &&
    frequencyPenalty === 0 && presencePenalty === 0 &&
    stopSequences === ""

  const isHistoriaDefaults =
    recentMessageCount === 10 && summaryFrequency === 20

  const modeloHasChanges =
    modelUpdate.provider !== (current.provider ?? "ollama") ||
    modelUpdate.providerInstanceId !== current.providerInstanceId ||
    modelUpdate.model !== current.model ||
    temperature !== (current.temperature ?? 0.7) ||
    maxTokens !== (current.maxTokens ?? 2048) ||
    topP !== (current.topP ?? 0.9) ||
    frequencyPenalty !== (current.frequencyPenalty ?? 0) ||
    presencePenalty !== (current.presencePenalty ?? 0) ||
    stopSequences !== (current.stopSequences?.join(", ") ?? "")

  const historiaHasChanges =
    recentMessageCount !== (current.recentMessageCount ?? 10) ||
    summaryFrequency !== (current.summaryFrequency ?? 20)

  const persistSettings = async (settings: ConversationSettingsUpdate) => {
    setSaving(true)
    try {
      const updated = await updateConversationSettings(conversationId, settings)
      onSettingsChanged(updated)
      toast.success(t("settings.saved"), {
        description: t("settings.savedDescription"),
      })
    } catch (error) {
      const message = error instanceof ApiClientError ? `[${error.code}] ${error.message}` : t("common.unknownError")
      toast.error(t("settings.saveFailed"), { description: message })
    } finally {
      setSaving(false)
    }
  }

  const resetModeloValues = () => {
    setTemperature(0.7)
    setMaxTokens(2048)
    setTopP(0.9)
    setFrequencyPenalty(0)
    setPresencePenalty(0)
    setStopSequences("")
  }

  const resetHistoriaValues = () => {
    setRecentMessageCount(10)
    setSummaryFrequency(20)
  }

  const handleModeloReset = () => {
    if (isModeloDefaults) {
      resetModeloValues()
    } else {
      setResetTarget("modelo")
      setResetConfirmOpen(true)
    }
  }

  const handleHistoriaReset = () => {
    if (isHistoriaDefaults) {
      resetHistoriaValues()
    } else {
      setResetTarget("historia")
      setResetConfirmOpen(true)
    }
  }

  const doReset = () => {
    if (resetTarget === "modelo") {
      resetModeloValues()
    } else if (resetTarget === "historia") {
      resetHistoriaValues()
    }
    setResetConfirmOpen(false)
  }

  const handleSaveModelo = async () => {
    const settings: ConversationSettingsUpdate = {}
    if (modelUpdate.provider !== (current.provider ?? "ollama")) {
      settings.provider = modelUpdate.provider ?? undefined
    }
    if (modelUpdate.providerInstanceId !== current.providerInstanceId) {
      settings.providerInstanceId = modelUpdate.providerInstanceId
    }
    if (modelUpdate.model !== current.model) settings.model = modelUpdate.model
    if (temperature !== (current.temperature ?? 0.7)) settings.temperature = temperature
    if (maxTokens !== (current.maxTokens ?? 2048)) settings.maxTokens = maxTokens
    if (topP !== (current.topP ?? 0.9)) settings.topP = topP
    if (frequencyPenalty !== (current.frequencyPenalty ?? 0))
      settings.frequencyPenalty = frequencyPenalty
    if (presencePenalty !== (current.presencePenalty ?? 0))
      settings.presencePenalty = presencePenalty
    if (stopSequences !== (current.stopSequences?.join(", ") ?? ""))
      settings.stopSequences = stopSequences.split(",").map((s) => s.trim()).filter(Boolean)
    await persistSettings(settings)
  }

  const handleSaveHistoria = async () => {
    const settings: ConversationSettingsUpdate = {}
    if (recentMessageCount !== (current.recentMessageCount ?? 10))
      settings.recentMessageCount = recentMessageCount
    if (summaryFrequency !== (current.summaryFrequency ?? 20))
      settings.summaryFrequency = summaryFrequency
    await persistSettings(settings)
  }

  const handleMemoryModeChange = async (mode: MemoryProposalMode) => {
    try {
      const updated = await updateConversationSettings(conversationId, {
        memoryProposalMode: mode,
      })
      onSettingsChanged(updated)
      toast.success(t("settings.memoryModeUpdated"))
    } catch (error) {
      const message = error instanceof ApiClientError ? `[${error.code}] ${error.message}` : t("common.unknownError")
      toast.error(t("settings.memoryModeFailed"), { description: message })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            children
              ? (children as ReactElement)
              : <Button variant="ghost" size="icon" data-icon="inline-start"><SettingsIcon /></Button>
          }
        />
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setSection("historia")}>
            <BookOpenTextIcon />
            {t("settings.menuHistory")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSection("modelo")}>
            <CpuIcon />
            {t("settings.menuModel")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSection("personalizacion")}>
            <PaletteIcon />
            {t("settings.menuCustomization")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSection("persona")}>
            <UserRoundIcon />
            {t("settings.menuPersona")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={section === "historia"} onOpenChange={(open) => setSection(open ? "historia" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>{t("settings.historyTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.historyDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto px-4">
            <Accordion value={openSections} onValueChange={setOpenSections} multiple>
              <AccordionItem value="mode">
                <AccordionTrigger>{t("settings.memoryMode")}</AccordionTrigger>
                <AccordionContent>
                  <MemoryModeCard
                    current={current.memoryProposalMode}
                    onChange={handleMemoryModeChange}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="proposals">
                <AccordionTrigger className="flex items-center gap-2">
                  {t("settings.proposals")}
                  {pendingCount > 0 ? (
                    <Badge>{pendingCount}</Badge>
                  ) : null}
                </AccordionTrigger>
                <AccordionContent>
                  <ProposalList conversationId={conversationId} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="summaries">
                <AccordionTrigger className="flex items-center gap-2">
                  {t("settings.summaries")}
                  {summaryCount > 0 ? (
                    <Badge>{summaryCount}</Badge>
                  ) : null}
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4">
                  <SummarySettingsCard
                    recentMessageCount={recentMessageCount}
                    summaryFrequency={summaryFrequency}
                    onRecentMessageCountChange={setRecentMessageCount}
                    onSummaryFrequencyChange={setSummaryFrequency}
                  />
                  <SummaryViewer conversationId={conversationId} summaryFrequency={summaryFrequency} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="decay">
                <AccordionTrigger>{t("settings.decay")}</AccordionTrigger>
                <AccordionContent>
                  <MemoryDecayCard
                    conversationId={conversationId}
                    current={current}
                    onSettingsChanged={onSettingsChanged}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="memories">
                <AccordionTrigger>{t("settings.memories")}</AccordionTrigger>
                <AccordionContent>
                  <MemoryList conversationId={conversationId} conversation={current} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <ActionsFooter
            hasChanges={historiaHasChanges}
            saving={saving}
            onSave={handleSaveHistoria}
            onReset={handleHistoriaReset}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={section === "modelo"} onOpenChange={(open) => setSection(open ? "modelo" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>{t("settings.modelTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.modelDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto px-4 pb-0.5">
            <ModelSelector
              current={current}
              onChange={setModelUpdate}
            />
            <div className="h-4"></div>
            <InferenceParamsCard
              temperature={temperature}
              topP={topP}
              frequencyPenalty={frequencyPenalty}
              presencePenalty={presencePenalty}
              maxTokens={maxTokens}
              stopSequences={stopSequences}
              onTemperatureChange={setTemperature}
              onTopPChange={setTopP}
              onFrequencyPenaltyChange={setFrequencyPenalty}
              onPresencePenaltyChange={setPresencePenalty}
              onMaxTokensChange={setMaxTokens}
              onStopSequencesChange={setStopSequences}
            />
          </div>
          <ActionsFooter
            hasChanges={modeloHasChanges}
            saving={saving}
            onSave={handleSaveModelo}
            onReset={handleModeloReset}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={section === "personalizacion"} onOpenChange={(open) => setSection(open ? "personalizacion" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>{t("settings.customizationTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.customizationDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto px-4">
            <CustomizationTab
              conversation={current}
              onSettingsChanged={onSettingsChanged}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={section === "persona"} onOpenChange={(open) => setSection(open ? "persona" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>{t("settings.personaTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.personaDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto px-4">
            <PlayerCharacterCard
              conversation={current}
              onSettingsChanged={onSettingsChanged}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.resetTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.resetDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={doReset}>{t("settings.reset")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}