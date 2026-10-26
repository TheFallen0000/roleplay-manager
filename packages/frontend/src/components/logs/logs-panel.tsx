import { useEffect, useState } from "react"
import { CopyIcon, DownloadIcon, RefreshCwIcon } from "lucide-react"

import type { LogLevelName } from "@workspace/shared/types/log"
import type { Locale } from "@workspace/shared/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

import { getLogsDownloadUrl } from "@/lib/api/logs"
import { copyTextToClipboard } from "@/lib/clipboard"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useLogsStore } from "@/lib/stores/logs.store"

const AUTO_REFRESH_MS = 5000

type LevelFilter = "all" | Exclude<LogLevelName, "debug">

const LEVEL_BADGE: Record<LogLevelName, string> = {
  debug: "border-border text-muted-foreground",
  info: "border-transparent bg-secondary text-secondary-foreground",
  warn: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  error: "border-transparent bg-destructive/10 text-destructive",
}

const LEVEL_LABEL_KEY = {
  all: "logs.levelAll",
  info: "logs.levelInfo",
  warn: "logs.levelWarn",
  error: "logs.levelError",
} as const

export function LogsPanel({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <LogsContent />
    </I18nProvider>
  )
}

function LogsContent() {
  const { t } = useTranslation()
  const entries = useLogsStore((state) => state.entries)
  const refreshing = useLogsStore((state) => state.refreshing)
  const refreshLogs = useLogsStore((state) => state.refresh)
  const [level, setLevel] = useState<LevelFilter>("all")
  const [auto, setAuto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const levelParam = level === "all" ? undefined : level

  useEffect(() => {
    refreshLogs({ level: levelParam })
      .then(() => setError(null))
      .catch(() => setError(t("logs.loadFailed")))
  }, [refreshLogs, levelParam, t])

  useEffect(() => {
    if (!auto) return
    const timer = setInterval(() => {
      refreshLogs({ level: levelParam })
        .then(() => setError(null))
        .catch(() => setError(t("logs.loadFailed")))
    }, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [auto, refreshLogs, levelParam, t])

  const handleCopy = async () => {
    const text = entries
      .map(
        (entry) =>
          `${entry.time} [${entry.level}] ${entry.message}${
            entry.context ? ` ${JSON.stringify(entry.context)}` : ""
          }`,
      )
      .join("\n")
    const copied = await copyTextToClipboard(text)
    if (copied) {
      toast.success(t("logs.copied"))
    } else {
      setError(t("logs.copyFailed"))
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("logs.title")}</CardTitle>
          <CardDescription>{t("logs.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("logs.levelFilter")}
              </span>
              <Select
                value={level}
                onValueChange={(value) => {
                  if (value) setLevel(value as LevelFilter)
                }}
              >
                <SelectTrigger
                  className="w-44"
                  aria-label={t("logs.levelFilter")}
                >
                  <SelectValue>{t(LEVEL_LABEL_KEY[level])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("logs.levelAll")}</SelectItem>
                  <SelectItem value="info">{t("logs.levelInfo")}</SelectItem>
                  <SelectItem value="warn">{t("logs.levelWarn")}</SelectItem>
                  <SelectItem value="error">{t("logs.levelError")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={auto}
                onCheckedChange={setAuto}
                aria-label={t("logs.auto")}
              />
              {t("logs.auto")}
            </label>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refreshLogs({ level: levelParam })
                    .then(() => setError(null))
                    .catch(() => setError(t("logs.loadFailed")))
                }}
                disabled={refreshing}
              >
                <RefreshCwIcon />
                {t("logs.refresh")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCopy()}
                disabled={entries.length === 0}
              >
                <CopyIcon />
                {t("logs.copy")}
              </Button>
              <a
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                href={getLogsDownloadUrl()}
                download
              >
                <DownloadIcon />
                {t("logs.download")}
              </a>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("logs.count", { count: entries.length })}
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            {entries.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {refreshing ? "…" : t("logs.empty")}
              </p>
            ) : (
              <ul className="divide-y">
                {entries.map((entry, index) => (
                  <li
                    key={`${entry.time}-${index}`}
                    className="flex flex-col gap-1 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(entry.time).toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("uppercase", LEVEL_BADGE[entry.level])}
                      >
                        {entry.level}
                      </Badge>
                      <span className="min-w-0 flex-1 break-words">
                        {entry.message}
                      </span>
                    </div>
                    {entry.context ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          {t("logs.context")}
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
                          {JSON.stringify(entry.context, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
