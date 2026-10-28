// Runs before paint: apply the saved theme and redirect Spanish browsers.
// Kept external so the site can enforce `script-src 'self'` without a hash.
;(() => {
  const root = document.documentElement
  const theme = localStorage.getItem("rm-theme") || "system"
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)

  if (root.dataset.autoLang === "false") return

  if (
    localStorage.getItem("rm-lang") ||
    location.pathname === "/es" ||
    location.pathname.startsWith("/es/")
  ) {
    return
  }
  const zones = [
    "America/Mexico",
    "America/Bogota",
    "America/Lima",
    "America/Santiago",
    "America/Argentina",
    "America/Caracas",
    "America/Panama",
    "America/Costa_Rica",
    "America/El_Salvador",
    "America/Guatemala",
    "America/Havana",
    "America/La_Paz",
    "America/Asuncion",
    "America/Montevideo",
    "America/Puerto_Rico",
    "America/Santo_Domingo",
    "Europe/Madrid",
    "Atlantic/Canary",
    "Africa/Ceuta",
    "Pacific/Galapagos",
  ]
  const languages = navigator.languages || [navigator.language]
  const spanishBrowser = languages.some(
    (language) => language && language.toLowerCase().startsWith("es")
  )
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  const spanishZone = zones.some((zone) => timezone.startsWith(zone))
  if (!spanishBrowser && !spanishZone) return
  const path = location.pathname.replace(/\/+$/, "")
  const target = path === "" ? "/es/" : `/es${path}/`
  location.replace(`${target}${location.search}${location.hash}`)
})()
