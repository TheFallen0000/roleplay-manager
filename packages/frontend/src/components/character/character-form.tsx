import {
  GripVerticalIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { Sortable, SortableItem, SortableItemHandle } from "@workspace/ui/components/sortable"

import type { CharacterDetail } from "@workspace/shared/types/character"
import { useCharacterForm } from "./use-character-form"
import { ProfileImageInput } from "@/components/shared/images/profile-image-input"
import { useTranslation } from "@/lib/hooks/use-translation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import type { Locale } from "@workspace/shared/i18n"

interface Props {
  character?: CharacterDetail
}

export function CharacterForm({ character, locale }: Props & { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <CharacterFormContent character={character} />
    </I18nProvider>
  )
}

function CharacterFormContent({ character }: Props) {
  const {
    isEditing,
    name, setName,
    subtitle, setSubtitle,
    profileImageAssetId,
    pendingFile,
    handleImageSelected,
    handleImageClear,
    description, setDescription,
    instructions, setInstructions,
    greeting, setGreeting,
    cards,
    versionNumber,
    activeTab, setActiveTab,
    saving,
    showDeleteDialog, setShowDeleteDialog,
    selectedVersionId, handleVersionChange,
    addCard,
    removeCard,
    reorderCards,
    updateCard,
    showError,
    markTouched,
    canSubmit,
    handleSubmit,
    handleDelete,
    handleStartConversation,
  } = useCharacterForm(character)
  const { t } = useTranslation()

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditing ? t("characters.editTitle") : t("characters.createTitle")}
          </h1>
          <div className="text-muted-foreground text-sm">
            {isEditing && character && character.versions.length > 1 ? (
              <Select value={selectedVersionId} onValueChange={(v) => { if (v) handleVersionChange(v) }}>
                <SelectTrigger className="h-6 text-xs px-2 w-auto min-w-0 inline-flex">
                  <SelectValue>v{versionNumber}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {character.versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber} · {v.createdAt.slice(0, 10)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              isEditing ? `v${versionNumber}` : t("characters.newTitle")
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={handleStartConversation}>
                <MessageSquarePlusIcon />
                {t("characters.startConversation")}
              </Button>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger render={<Button variant="destructive" />}>
                    {t("common.delete")}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("characters.deleteDialogTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("characters.deleteConfirmDescription", {
                        name: character?.name ?? "",
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
                      {t("common.delete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
          <Button type="submit" disabled={!canSubmit}>
            {isEditing ? t("characters.saveChanges") : t("characters.createTitle")}
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">{t("characters.tabGeneral")}</TabsTrigger>
          <TabsTrigger value="cards">
            {t("characters.tabCards")}
            {cards.length > 0 ? <Badge variant="secondary" className="ml-2">{cards.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-4 pt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t("characters.fieldName")}</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder={t("characters.namePlaceholder")}
                maxLength={50}
              />
              <FieldError>{showError("name")}</FieldError>
              <CharCounter current={name.length} max={50} />
            </Field>

            <Field>
              <FieldLabel htmlFor="subtitle">{t("characters.fieldSubtitle")}</FieldLabel>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={t("characters.subtitlePlaceholder")}
                maxLength={80}
              />
              <FieldDescription>{t("characters.subtitleHint")}</FieldDescription>
              <CharCounter current={subtitle.length} max={80} />
            </Field>

            <Field>
              <FieldLabel htmlFor="profileImage">{t("characters.fieldProfileImage")}</FieldLabel>
              <ProfileImageInput
                characterId={character?.id ?? ""}
                name={name}
                profileImageAssetId={profileImageAssetId}
                pendingFile={pendingFile}
                onFileSelected={handleImageSelected}
                onClear={handleImageClear}
              />
              <FieldError>{showError("profileImage")}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="greeting">{t("characters.fieldGreeting")}</FieldLabel>
              <Textarea
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                onBlur={() => markTouched("greeting")}
                placeholder={t("characters.greetingPlaceholder")}
                maxLength={2000}
              />
              <FieldError>{showError("greeting")}</FieldError>
              <CharCounter current={greeting.length} max={2000} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">{t("characters.fieldDescription")}</FieldLabel>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => markTouched("description")}
                placeholder={t("characters.descriptionPlaceholder")}
                maxLength={2000}
              />
              <FieldError>{showError("description")}</FieldError>
              <CharCounter current={description.length} max={2000} />
            </Field>

            <Field>
              <FieldLabel htmlFor="instructions">{t("characters.fieldInstructions")}</FieldLabel>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("characters.instructionsPlaceholder")}
                maxLength={1500}
              />
              <FieldDescription>
                {t("characters.instructionsHint")}
              </FieldDescription>
              <CharCounter current={instructions.length} max={1500} />
            </Field>
          </FieldGroup>
        </TabsContent>

        <TabsContent value="cards" className="flex flex-col gap-4 pt-4">
          <FieldContent>
              <p className="text-muted-foreground text-sm">
                {t("characters.cardsHint")}
              </p>
          </FieldContent>

          <div className="max-h-96 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-popover py-1">
              <Button type="button" variant="outline" onClick={addCard} className="w-full">
                <PlusIcon />
                {t("characters.addCard")}
              </Button>
            </div>
            <Sortable
              value={cards}
              onMove={({ activeIndex, overIndex }) => reorderCards(activeIndex, overIndex)}
              getItemValue={(card) => card.id}
              strategy="vertical"
              className="mt-3 flex flex-col gap-3"
            >
              {cards.map((card, idx) => (
                <SortableItem key={card.id} value={card.id}>
                  <div className="flex gap-3 rounded-lg border p-3">
                    <SortableItemHandle className="flex items-center rounded text-muted-foreground hover:text-foreground">
                      <GripVerticalIcon className="size-4" />
                    </SortableItemHandle>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      value={card.title}
                      onChange={(e) => updateCard(idx, "title", e.target.value)}
                      onBlur={() => markTouched(`card-${idx}`)}
                      placeholder={t("characters.cardTitlePlaceholder")}
                      maxLength={50}
                    />
                    <Textarea
                      value={card.content}
                      onChange={(e) => updateCard(idx, "content", e.target.value)}
                      onBlur={() => markTouched(`card-${idx}`)}
                      placeholder={t("characters.cardContentPlaceholder")}
                      maxLength={2500}
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={card.active}
                          onChange={(e) => updateCard(idx, "active", e.target.checked)}
                        />
                        {t("characters.cardActive")}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCard(idx)}
                        className="ml-auto flex items-center gap-1 text-xs text-destructive hover:underline"
                      >
                        <Trash2Icon className="size-3" />
                        {t("common.delete")}
                      </button>
                    </div>
                    <FieldError>{showError(`card-${idx}`)}</FieldError>
                    <CharCounter current={card.content.length} max={2500} />
                  </div>
                  </div>
                </SortableItem>
              ))}
            </Sortable>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max
  return (
    <p className={`text-right text-xs ${pct >= 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
      {current} / {max}
    </p>
  )
}
