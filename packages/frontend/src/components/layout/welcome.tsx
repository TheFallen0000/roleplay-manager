import { useState } from "react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { SUPPORTED_LOCALES, type Locale } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
import { useTheme } from "@/lib/hooks/use-theme"
import { useTranslation } from "@/lib/hooks/use-translation"
import { setOnboardedCookie } from "@/lib/onboarding"
import { COLOR_MODES, THEMES, type ColorMode } from "@/lib/themes"
import { BrandMascot } from "./brand"

const MODE_ICONS = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} as const

/** Time the welcome sparkle gets before the app reloads. */
const BURST_MS = 420

export function Welcome({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <ThemeProvider>
        <WelcomeContent />
      </ThemeProvider>
    </I18nProvider>
  )
}

function WelcomeContent() {
  const { locale, setLocale, t } = useTranslation()
  const { theme, mode, setTheme, setMode } = useTheme()
  const [bursting, setBursting] = useState(false)

  const handleContinue = () => {
    if (bursting) return
    setBursting(true)
    window.setTimeout(() => {
      setOnboardedCookie()
      try {
        window.location.reload()
      } catch {
        // reload unavailable (tests)
      }
    }, BURST_MS)
  }

  return (
    <div className="relative grid min-h-svh lg:grid-cols-[1.15fr_1fr]">
      {/* Papel con grano: el material del mundo, no un degradado. */}
      <div
        aria-hidden
        className="rm-paper-grain pointer-events-none absolute inset-0 opacity-[0.05]"
      />
      {/* Portada: el nombre, la mascota y la promesa del producto. */}
      <section className="relative flex flex-col justify-center gap-8 overflow-hidden border-b border-border px-6 py-12 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
        <h1 className="font-display text-[clamp(3rem,2.2rem+6.5vw,6rem)] leading-[1.02] tracking-[-0.02em] text-balance">
          Roleplay{" "}
          <span className="block text-[clamp(1.5rem,1.1rem+2.4vw,2.9rem)] text-primary">
            Manager
          </span>
        </h1>
        <div className="relative flex flex-wrap items-end gap-6">
          <BrandMascot className="w-32 shrink-0 -rotate-2 drop-shadow-[0_10px_18px_rgba(60,40,80,0.18)] sm:w-40 lg:w-52" />
          <p className="max-w-md pb-1 text-base text-muted-foreground sm:text-lg">
            {t("welcome.tagline")}
          </p>
        </div>
      </section>

      {/* Decisiones de primer arranque, como placas de tinta. */}
      <section
        aria-label={t("welcome.world")}
        className="flex flex-col justify-center bg-card/50 px-6 py-10 lg:px-12"
      >
        <div className="mx-auto grid w-full max-w-md gap-4">
          <Placa label={t("welcome.language")}>
            <ToggleGroup
              value={[locale]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setLocale(next as Locale, { reload: false })
              }}
              variant="outline"
              className="w-full"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <ToggleGroupItem key={code} value={code} className="flex-1">
                  {t(`language.${code}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Placa>

          <Placa label={t("welcome.world")} hint={t("welcome.worldHint")}>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  aria-pressed={theme === definition.id}
                  onClick={() => setTheme(definition.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-[border-color,color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:text-foreground aria-pressed:border-primary/60 aria-pressed:text-foreground aria-pressed:shadow-[0_0_0_3px_var(--ring)]"
                >
                  <span
                    aria-hidden
                    className="size-4 rounded-full ring-1 ring-foreground/15"
                    style={{ backgroundColor: definition.swatch }}
                  />
                  {t(definition.labelKey)}
                </button>
              ))}
            </div>
          </Placa>

          <Placa label={t("welcome.mode")}>
            <ToggleGroup
              value={[mode]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setMode(next as ColorMode)
              }}
              variant="outline"
              className="w-full"
            >
              {COLOR_MODES.map((definition) => {
                const Icon = MODE_ICONS[definition.id]
                return (
                  <ToggleGroupItem
                    key={definition.id}
                    value={definition.id}
                    className="flex-1"
                  >
                    <Icon data-icon="inline-start" />
                    {t(definition.labelKey)}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </Placa>

          <div className="relative mt-1 grid gap-2.5">
            {bursting ? <SparkleBurst /> : null}
            <Button
              size="lg"
              className="w-full"
              disabled={bursting}
              onClick={handleContinue}
            >
              {t("welcome.continue")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("welcome.privacy")}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Placa({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2.5 rounded-2xl border border-border bg-card/80 p-4">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

/** Destello de un solo uso al empezar: ocho rayos dorados. */
function SparkleBurst() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 130 130"
      className="pointer-events-none absolute left-1/2 top-0 size-32 -translate-x-1/2 -translate-y-1/3 animate-rm-burst motion-reduce:hidden"
    >
      <g stroke="var(--spark)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M65 6v16" />
        <path d="M65 108v16" />
        <path d="M6 65h16" />
        <path d="M108 65h16" />
        <path d="M24 24l11 11" />
        <path d="M95 95l11 11" />
        <path d="M106 24L95 35" />
        <path d="M35 95l-11 11" />
      </g>
    </svg>
  )
}
