/* Card-first prototypes — interacciones de revisión, no forma parte del producto. */
;(() => {
  const root = document.documentElement

  /* ---------- 1. Diálogo Crear ------------------------------------------ */
  const modal = document.querySelector("[data-create-modal]")
  let lastFocus = null

  if (modal && !modal.hidden) {
    document.body.classList.add("cf-modal-open")
  }

  const focusables = () =>
    Array.from(
      modal?.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, summary, [tabindex]:not([tabindex="-1"])'
      ) ?? []
    ).filter((el) => !el.hasAttribute("hidden"))

  const openModal = () => {
    if (!modal) return
    lastFocus = document.activeElement
    modal.hidden = false
    document.body.classList.add("cf-modal-open")
    modal.querySelector("[data-create-plate]")?.focus()
  }

  const closeModal = () => {
    if (!modal) return
    modal.hidden = true
    document.body.classList.remove("cf-modal-open")
    if (lastFocus instanceof HTMLElement) lastFocus.focus()
  }

  document.querySelectorAll("[data-open-create]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault()
      openModal()
    })
  })

  document.querySelectorAll("[data-close-create]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault()
      closeModal()
    })
  })

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal()
  })

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.hidden) return
    if (event.key === "Escape") {
      event.preventDefault()
      closeModal()
      return
    }
    if (event.key !== "Tab") return
    const items = focusables()
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })

  /* ---------- 2. Nav de secciones --------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll("[data-section-link]"))
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean)

  if (navLinks.length > 0 && "IntersectionObserver" in window) {
    const setActive = (id) => {
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`
        link.classList.toggle("is-active", active)
        if (active) link.setAttribute("aria-current", "true")
        else link.removeAttribute("aria-current")
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 1] }
    )

    sections.forEach((section) => observer.observe(section))

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const id = link.getAttribute("href")?.slice(1)
        if (id) setActive(id)
      })
    })
  }

  /* ---------- 3. Estado sucio / save bar -------------------------------- */
  const saveBar = document.querySelector("[data-save-bar]")
  if (saveBar) {
    const status = saveBar.querySelector("[data-save-status]")
    const label = saveBar.querySelector("[data-save-label]")
    const markDirty = () => {
      saveBar.dataset.dirty = "true"
      status?.classList.add("is-dirty")
      if (label) label.textContent = "Cambios sin guardar"
    }
    document
      .querySelectorAll(
        "[data-dirty-scope] input, [data-dirty-scope] textarea, [data-dirty-scope] select"
      )
      .forEach((field) => {
        field.addEventListener("input", markDirty)
        field.addEventListener("change", markDirty)
      })
  }

  /* ---------- 4. Filtro de lorebooks ------------------------------------ */
  const filterButtons = Array.from(
    document.querySelectorAll("[data-book-filter]")
  )
  if (filterButtons.length > 0) {
    const applyFilter = (filter) => {
      document.querySelectorAll("[data-book-card]").forEach((card) => {
        const linked = card.dataset.linked === "true"
        const show =
          filter === "all" ||
          (filter === "linked" && linked) ||
          (filter === "unlinked" && !linked)
        card.classList.toggle("cf-hidden", !show)
      })
      filterButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.bookFilter === filter)
        )
      })
    }
    filterButtons.forEach((button) => {
      button.addEventListener("click", () =>
        applyFilter(button.dataset.bookFilter || "all")
      )
    })
    applyFilter("all")
  }

  /* ---------- 5. Añadir entrada de lorebook ----------------------------- */
  const entryTemplate = document.querySelector("#cf-entry-template")
  document.querySelectorAll("[data-add-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const list =
        button.closest("[data-entry-list]") ??
        button.closest(".cf-panel-body")?.querySelector("[data-entry-list]")
      if (!list || !entryTemplate) return
      const fragment = entryTemplate.content.cloneNode(true)
      const details = fragment.querySelector("details")
      list.appendChild(fragment)
      details?.setAttribute("open", "")
      details?.querySelector("summary")?.focus()
    })
  })

  /* ---------- 6. Ficha de personaje: lorebook e imagen ------------------ */
  const lorebookSelect = document.querySelector("[data-lorebook-select]")
  const lorebookEmpty = document.querySelector("[data-lorebook-empty]")
  const lorebookPicker = document.querySelector("[data-lorebook-picker]")
  const lorebookClear = document.querySelector("[data-clear-lorebook]")
  const lorebookName = document.querySelector("[data-lorebook-name]")
  const lorebookMeta = document.querySelector("[data-lorebook-meta]")
  const lorebookData = {
    "bosque-v3": ["Bosque de Lyra", "v3 · 12 entradas · scan 4 · 400 tokens"],
    "bosque-v2": ["Bosque de Lyra", "v2 · 10 entradas · scan 4 · 400 tokens"],
    "bosque-v1": ["Bosque de Lyra", "v1 · 8 entradas · scan 4 · 400 tokens"],
    "ciudad-v1": ["Ciudad Sumergida", "v1 · 4 entradas · scan 2 · 300 tokens"],
  }
  const syncLorebook = () => {
    if (!lorebookSelect) return
    const empty = lorebookSelect.value === ""
    const data = lorebookData[lorebookSelect.value]
    if (lorebookName && data) lorebookName.textContent = data[0]
    if (lorebookMeta && data) lorebookMeta.textContent = data[1]
    if (lorebookEmpty) lorebookEmpty.hidden = !empty
    if (lorebookClear) lorebookClear.hidden = empty
    lorebookPicker
      ?.querySelectorAll(".spine, .body")
      .forEach((el) => (el.hidden = empty))
  }
  lorebookSelect?.addEventListener("change", syncLorebook)
  document
    .querySelector("[data-clear-lorebook]")
    ?.addEventListener("click", () => {
      if (lorebookSelect) {
        lorebookSelect.value = ""
        syncLorebook()
      }
    })
  syncLorebook()

  const avatarPreview = document.querySelector("[data-avatar-preview]")
  const avatarPlaceholder = document.querySelector("[data-avatar-placeholder]")
  document
    .querySelector("[data-clear-image]")
    ?.addEventListener("click", () => {
      if (avatarPreview) avatarPreview.hidden = true
      if (avatarPlaceholder) avatarPlaceholder.hidden = false
    })
  document
    .querySelector("[data-upload-image]")
    ?.addEventListener("click", () => {
      if (avatarPreview) avatarPreview.hidden = false
      if (avatarPlaceholder) avatarPlaceholder.hidden = true
    })

  /* ---------- 7. Modo claro/oscuro (reutiliza prototype.js) ------------- */
  if (root.dataset.cardFirstReady === "true") {
    // prototype.js ya inicializó el modo; no hacemos nada.
  }
})()
