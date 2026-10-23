const root = document.documentElement
const THEME_KEY = "rm-theme"
const LANG_KEY = "rm-lang"
const mq = window.matchMedia("(prefers-color-scheme: dark)")

const $ = (selector: string, scope: ParentNode = document) =>
  scope.querySelector<HTMLElement>(selector)
const $$ = (selector: string, scope: ParentNode = document) => [
  ...scope.querySelectorAll<HTMLElement>(selector),
]

const applyTheme = (theme: string, persist = false) => {
  if (!["light", "dark", "system"].includes(theme)) theme = "system"
  const dark = theme === "dark" || (theme === "system" && mq.matches)
  root.classList.toggle("dark", dark)
  root.dataset.theme = theme
  if (persist) localStorage.setItem(THEME_KEY, theme)
  $$("[data-theme-set]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.themeSet === theme)
    )
  })
}

const initTheme = () => {
  applyTheme(localStorage.getItem(THEME_KEY) || "system")
  $$("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(root.classList.contains("dark") ? "light" : "dark", true)
    })
  })
  $$("[data-theme-set]").forEach((button) => {
    button.addEventListener("click", () =>
      applyTheme(button.dataset.themeSet ?? "system", true)
    )
  })
  mq.addEventListener?.("change", () => {
    if ((localStorage.getItem(THEME_KEY) || "system") === "system") {
      applyTheme("system")
    }
  })
}

const initMenu = () => {
  const toggle = $("[data-menu-toggle]")
  const menu = $("#mobile-menu")
  if (!toggle || !menu) return
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute("aria-expanded", String(open))
  }
  toggle.addEventListener("click", () => setOpen(menu.hasAttribute("hidden")))
  $$("a", menu).forEach((link) =>
    link.addEventListener("click", () => setOpen(false))
  )
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      setOpen(false)
      toggle.focus()
    }
  })
}

const detectOS = () => {
  const ua = navigator.userAgent || ""
  const userAgentData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  const platform = userAgentData?.platform || navigator.platform || ""
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/i.test(platform))
  if (mobile) return "mobile"
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "win"
  if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) return "mac"
  if (/Linux|X11/i.test(platform) || /Linux/i.test(ua)) return "linux"
  return "unknown"
}

const capitalize = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`

const applyOS = () => {
  const os = detectOS()
  const primary = $("[data-download-primary]")
  if (primary) {
    const label = $("[data-os-label]", primary)
    const meta = $("[data-os-meta]")
    if (label) {
      label.textContent = primary.dataset[`label${capitalize(os)}`] ?? ""
    }
    if (meta) {
      meta.textContent = primary.dataset[`meta${capitalize(os)}`] ?? ""
    }
    if (os === "win" && primary.dataset.winUrl) {
      primary.setAttribute("href", primary.dataset.winUrl)
      primary.dataset.direct = "true"
    } else {
      primary.setAttribute("href", "#platforms")
      delete primary.dataset.direct
    }
  }

  const recommended =
    os === "win"
      ? "win-x64"
      : os === "mac"
        ? "mac-arm64"
        : os === "linux"
          ? "linux-x64"
          : null
  $$("[data-platform]").forEach((platform) => {
    const badge = $(".rec", platform)
    if (badge) badge.hidden = platform.dataset.platform !== recommended
  })
}

const openDialog = (dialog: HTMLDialogElement | null) => {
  if (!dialog) return
  if (typeof dialog.showModal === "function") dialog.showModal()
  else dialog.setAttribute("open", "")
  $("button, a", dialog)?.focus()
}

const closeDialog = (dialog: HTMLDialogElement | null) => {
  if (!dialog) return
  if (typeof dialog.close === "function") dialog.close()
  else dialog.removeAttribute("open")
}

const initDialogs = () => {
  const dialog = $("#platforms") as HTMLDialogElement | null
  $$("[data-open-platforms]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault()
      openDialog(dialog)
    })
  })
  $$("dialog").forEach((element) => {
    $$("[data-dialog-close]", element).forEach((button) => {
      button.addEventListener("click", () =>
        closeDialog(element as HTMLDialogElement)
      )
    })
    element.addEventListener("click", (event) => {
      if (event.target === element) closeDialog(element as HTMLDialogElement)
    })
  })
  $("[data-download-primary]")?.addEventListener("click", (event) => {
    const primary = event.currentTarget as HTMLElement
    if (primary.dataset.direct !== "true") {
      event.preventDefault()
      openDialog(dialog)
    }
  })
}

const initGallery = () => {
  const tabs = $$("[data-gallery-tab]")
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((other) => {
        other.setAttribute("aria-selected", String(other === tab))
        other.tabIndex = other === tab ? 0 : -1
      })
      $$("[data-gallery-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.galleryPanel !== tab.dataset.galleryTab
      })
    })
  })
}

const initLanguage = () => {
  $$("[data-lang-set]").forEach((link) => {
    link.addEventListener("click", () => {
      localStorage.setItem(LANG_KEY, link.dataset.langSet ?? "en")
    })
  })
}

initTheme()
initMenu()
initDialogs()
initGallery()
initLanguage()
applyOS()
