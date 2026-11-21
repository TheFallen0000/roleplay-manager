import { useState } from "react"
import { EyeIcon, MessageSquarePlusIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import type { TranslationKey } from "@workspace/shared/i18n"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { AlternateGreetingPicker } from "@/components/shared/alternate-greeting-picker"
import { createConversation } from "@/lib/api/conversations"
import { translateApiError } from "@/lib/translate-api-error"
import { useTranslation } from "@/lib/hooks/use-translation"

import { VersionPreviewDialog } from "../version-preview-dialog"
import type { CharacterPageState } from "../use-character-page"

const STATUS_KEYS: Record<
  "current" | "outdated" | "deleted",
  TranslationKey
> = {
  current: "characters.versionCurrent",
  outdated: "characters.versionOutdated",
  deleted: "characters.versionDeleted",
}

export function VersionsSection({ state }: { state: CharacterPageState }) {
  const { t, tRaw } = useTranslation()
  const { versions, character } = state
  const [preview, setPreview] = useState<CharacterVersionDTO | null>(null)
  const [greetingVersion, setGreetingVersion] =
    useState<CharacterVersionDTO | null>(null)
  const [starting, setStarting] = useState<string | null>(null)

  const createConversationFor = async (
    versionId: string,
    greetingIndex?: number,
  ) => {
    if (!character) return
    setStarting(versionId)
    try {
      const result = await createConversation({
        characterId: character.id,
        versionId,
        ...(greetingIndex !== undefined ? { greetingIndex } : {}),
      })
      if (result.defaultProviderStatus === "unavailable") {
        toast.warning(t("characters.providerUnavailable"))
      }
      window.location.assign(`/conversations/${result.conversation.id}`)
    } catch (error) {
      toast.error(
        translateApiError(
          error,
          tRaw,
          t("characters.conversationCreateFailed"),
        ),
      )
    } finally {
      setStarting(null)
    }
  }

  const startConversation = (version: CharacterVersionDTO) => {
    if ((version.alternateGreetings?.length ?? 0) > 0) {
      setGreetingVersion(version)
      return
    }
    void createConversationFor(version.id)
  }

  const handleGreetingConfirm = (greetingIndex: number) => {
    const version = greetingVersion
    setGreetingVersion(null)
    if (version) {
      void createConversationFor(version.id, greetingIndex)
    }
  }

  return (
    <SectionPanel
      id="section-versions"
      kicker={`05 · ${t("characters.sectionVersions")}`}
      title={t("characters.sectionVersions")}
      description={t("characters.versionsHint")}
    >
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("characters.versionsEmpty")}
        </p>
      ) : (
        <ul className="rm-version-list">
          {versions.toReversed().map((version) => {
            const isCurrent =
              character?.currentVersion.id === version.id
            return (
              <li
                key={version.id}
                className={
                  isCurrent
                    ? "rm-version rm-version--current"
                    : "rm-version"
                }
              >
                <span className="rm-chip rm-chip--violet">
                  v{version.versionNumber}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">
                      {version.subtitle || version.name}
                    </span>
                    {isCurrent ? (
                      <span className="rm-chip">
                        {t("characters.versionCurrent")}
                      </span>
                    ) : null}
                    <span className="when">{version.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="note">
                    {version.lorebookVersion
                      ? `${version.lorebookVersion.name ?? t("common.untitled")} v${version.lorebookVersion.versionNumber} · ${t(STATUS_KEYS[version.lorebookVersion.status])}`
                      : t("characters.lorebookNone")}
                  </p>
                </div>
                <div className="rm-version-actions flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    className="rm-btn rm-btn--quiet rm-btn--sm"
                    onClick={() => setPreview(version)}
                  >
                    <EyeIcon className="size-4" />
                    {t("characters.versionView")}
                  </button>
                  <button
                    type="button"
                    className="rm-btn rm-btn--ghost rm-btn--sm"
                    onClick={() => startConversation(version)}
                    disabled={starting === version.id}
                  >
                    <MessageSquarePlusIcon className="size-4" />
                    {t("characters.versionStart")}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlternateGreetingPicker
        open={greetingVersion !== null}
        greeting={greetingVersion?.greeting ?? ""}
        alternateGreetings={greetingVersion?.alternateGreetings ?? []}
        onOpenChange={(open) => {
          if (!open) setGreetingVersion(null)
        }}
        onConfirm={handleGreetingConfirm}
      />

      <VersionPreviewDialog
        version={preview}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </SectionPanel>
  )
}
