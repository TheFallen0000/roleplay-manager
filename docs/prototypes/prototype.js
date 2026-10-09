/* Prototipo Ink & Violet — chrome de revisión, no forma parte del producto.
   - Modo claro/oscuro/sistema (persistido en localStorage)
   - Selector de mundo (data-world en <html>)
   - Selector de estilo de mensaje y color de diálogo (solo chat.html)
   - Destello al confirmar (welcome.html) */
(() => {
  const root = document.documentElement;
  const MODE_KEY = "rm-proto-mode";

  /* ---------- modo ---------- */
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function applyMode(mode) {
    const dark = mode === "dark" || (mode === "system" && prefersDark.matches);
    root.classList.toggle("dark", dark);
    document.querySelectorAll("[data-mode-set]").forEach((el) => {
      el.setAttribute("aria-pressed", String(el.dataset.modeSet === mode));
    });
    localStorage.setItem(MODE_KEY, mode);
  }

  applyMode(localStorage.getItem(MODE_KEY) || "system");
  prefersDark.addEventListener?.("change", () => {
    const mode = localStorage.getItem(MODE_KEY) || "system";
    if (mode === "system") applyMode("system");
  });
  document.querySelectorAll("[data-mode-set]").forEach((el) => {
    el.addEventListener("click", () => applyMode(el.dataset.modeSet));
  });

  /* ---------- mundo ---------- */
  function applyWorld(world) {
    root.dataset.world = world;
    document.querySelectorAll("[data-world-set]").forEach((el) => {
      el.setAttribute("aria-pressed", String(el.dataset.worldSet === world));
    });
  }
  applyWorld(root.dataset.world || "default");
  document.querySelectorAll("[data-world-set]").forEach((el) => {
    el.addEventListener("click", () => applyWorld(el.dataset.worldSet));
  });

  /* ---------- chat: estilo de mensaje ---------- */
  const messages = document.querySelector("#messages");
  if (messages) {
    const applyStyle = (style) => {
      messages.dataset.style = style;
      document.querySelectorAll("[data-style-set]").forEach((el) => {
        el.setAttribute("aria-pressed", String(el.dataset.styleSet === style));
      });
    };
    applyStyle(messages.dataset.style || "bubble");
    document.querySelectorAll("[data-style-set]").forEach((el) => {
      el.addEventListener("click", () => applyStyle(el.dataset.styleSet));
    });
  }

  /* ---------- chat: color de diálogo ---------- */
  document.querySelectorAll("[data-char-color]").forEach((el) => {
    el.addEventListener("click", () => {
      messages?.style.setProperty("--dialogue-char", el.dataset.charColor);
      document.querySelectorAll("[data-char-color]").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === el));
      });
    });
  });

  /* ---------- destello al confirmar ---------- */
  document.querySelectorAll("[data-sparkle]").forEach((el) => {
    el.addEventListener("click", () => {
      const parent = el.closest(".sparkle");
      parent?.classList.add("sparkle--burst");
      const href = el.getAttribute("href");
      if (href) setTimeout(() => (window.location.href = href), 420);
    });
  });
})();
