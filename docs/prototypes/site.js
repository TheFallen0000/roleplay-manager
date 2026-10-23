/* Prototype behaviour for roleplay-manager.com.
   Not production code: the Astro build will replace this with route-level i18n,
   a real release fetcher and progressive enhancement. */
;(() => {
  const root = document.documentElement
  const $ = (selector, scope = document) => scope.querySelector(selector)
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ]
  const LANG_KEY = "rm-site-lang"
  const THEME_KEY = "rm-site-theme"
  const mq = window.matchMedia("(prefers-color-scheme: dark)")

  const copy = {
    en: {
      "nav.docs": "Documentation",
      "nav.how": "How it works",
      "nav.features": "Features",
      "nav.download": "Download",
      "header.docs": "Documentation",
      "header.download": "Download",
      "header.menu": "Menu",
      "header.lang": "Language",
      "header.theme": "Theme",
      "header.github": "GitHub repository",
      "hero.title":
        'Your story lives <span class="accent">on your machine.</span>',
      "hero.lede":
        "Roleplay Manager is a local-first notebook for long chats with AI characters: versioned characters, real memory, branches — and your data in a folder you own.",
      "hero.cta": "Download for Windows",
      "hero.other": "Other platforms",
      "hero.micro.version": "v1.47.0",
      "hero.micro.noNode": "No Node.js",
      "hero.micro.noAccount": "No account",
      "hero.micro.size": "62 MB",
      "trust.1.title": "100% local",
      "trust.1.sub": "Your data stays in ./data",
      "trust.2.title": "Open source",
      "trust.2.sub": "AGPL-3.0 · no telemetry",
      "trust.3.title": "Windows · Linux · macOS",
      "trust.3.sub": "Portable package, no installer",
      "trust.4.title": "Your provider",
      "trust.4.sub": "Ollama or OpenAI-compatible",
      "ledger.title": "Why it feels different.",
      "ledger.lede":
        "Not another chat wrapper. A notebook that remembers, on a machine you control.",
      "ledger.1.label": "Local",
      "ledger.1.title": "Your story never leaves your folder.",
      "ledger.1.body":
        "Characters, chats, memories and images live in a SQLite database inside data/. Move the folder, back it up, or take it with you.",
      "ledger.2.label": "Continuity",
      "ledger.2.title": "Long stories don't lose the thread.",
      "ledger.2.body":
        "Versioned characters, dynamic memory, automatic summaries and branches keep weeks of writing coherent.",
      "ledger.3.label": "Provider",
      "ledger.3.title": "You choose the intelligence.",
      "ledger.3.body":
        "Run Ollama locally or connect any OpenAI-compatible endpoint with your own key. The app never locks you in.",
      "gallery.title": "See the notebook.",
      "gallery.lede":
        "Real screens from the app. No mockups, no invented testimonials.",
      "gallery.tab.library": "Character library",
      "gallery.tab.chat": "Chat",
      "gallery.caption.library":
        "Versioned characters with their own art, memory and conversations.",
      "gallery.caption.chat":
        "Streaming replies, editable messages and branches when a scene goes another way.",
      "gallery.caption.note": "Screenshot from the app · synthetic content",
      "steps.title": "From download to first scene.",
      "steps.lede": "No Node.js, no installer, no account.",
      "steps.1.title": "Download and unzip",
      "steps.1.body":
        "Pick the package for your system. Keep it in a folder you'll remember, like Documents.",
      "steps.2.title": "Open the launcher",
      "steps.2.body":
        "Run start.cmd on Windows or ./start.sh on Linux and macOS. Your browser opens at localhost:3001.",
      "steps.3.title": "Connect your AI",
      "steps.3.body":
        "Add Ollama or an OpenAI-compatible endpoint, pick a model, and create your first character.",
      "steps.note":
        "First launch may show a system warning because the app is not signed. The install guide walks you through it.",
      "features.title": "A notebook that remembers.",
      "features.lede":
        "Characters evolve, scenes branch, and the story keeps its context.",
      "features.1.title": "Versioned characters",
      "features.1.body":
        "Every edit creates a new version. Import and export characters as portable JSON.",
      "features.2.title": "Branches and rewinds",
      "features.2.body":
        "Go back to any message, regenerate a reply, or open a parallel line without losing the original.",
      "features.3.title": "Memory and summaries",
      "features.3.body":
        "Dynamic memory with decay and automatic summaries keep long chats inside the model's context.",
      "features.4.title": "Your reading style",
      "features.4.body":
        "Bubble, document or visual novel; five color worlds; light and dark.",
      "data.title": "Your data doesn't live in a cloud.",
      "data.lede":
        "It lives in a folder you can open, copy and back up. Updates never touch it.",
      "data.note":
        "If you use a remote provider, only the prompt you send leaves your machine. If you use Ollama, inference stays local.",
      "data.link": "How data and updates work",
      "data.folderLabel": "Your folder",
      "data.folderFoot":
        "Updates swap versions and leave data/ and backups/ untouched.",
      "phone.title": "Your story fits in your pocket.",
      "phone.lede":
        "The app runs on your computer. Your phone opens it through a private link — no native app required.",
      "phone.1":
        "Tailscale: private access from anywhere, with nothing exposed to the internet.",
      "phone.2": "Home Wi-Fi: open it from the couch on the same network.",
      "phone.3": "Install it as a PWA with its own icon and window.",
      "phone.cta": "Phone access guide",
      "docs.title": "The manual, without fine print.",
      "docs.lede":
        "Installation, providers, memory, branches, backups and the phone. Searchable and written for humans.",
      "docs.1": "Install on Windows, Linux or macOS",
      "docs.1.desc": "Portable package · no Node.js",
      "docs.2": "Connect Ollama or an OpenAI-compatible provider",
      "docs.2.desc": "Local or remote · your key",
      "docs.3": "Create a character and start your first chat",
      "docs.3.desc": "Versions · greetings · cards",
      "docs.4": "Use it on your phone with Tailscale or LAN",
      "docs.4.desc": "Private link · PWA install",
      "docs.cta": "Browse the documentation",
      "faq.title": "The questions that stop people.",
      "faq.lede": "Short answers before you download.",
      "faq.1.q": "Is it free?",
      "faq.1.a":
        "Yes. Roleplay Manager is free and open source under AGPL-3.0. You only pay your AI provider if you use a paid endpoint.",
      "faq.2.q": "Do I need Node.js?",
      "faq.2.a":
        "No. The portable package includes its own Node runtime. You only need Node if you want to develop the project.",
      "faq.3.q": "Do I need an API key?",
      "faq.3.a":
        "Not if you run Ollama locally. For a remote provider, bring your own key.",
      "faq.4.q": "Where are my characters and chats?",
      "faq.4.a":
        "In data/ inside the app folder: a SQLite database and your images. Back up that folder or move the whole app anytime.",
      "faq.5.q": "Will it run on my computer?",
      "faq.5.a":
        "There are packages for Windows x64, Linux x64/arm64 and macOS Apple Silicon/Intel. A modern 64-bit system is enough; a GPU only matters if you run large models locally.",
      "faq.6.q": "Is there a mobile app?",
      "faq.6.a":
        "No native app. The app runs on your computer and your phone opens it through Tailscale or your home network. You can install it as a PWA.",
      "faq.7.q": "Why does Windows or macOS warn me?",
      "faq.7.a":
        "The binaries are not signed. The install guide explains the one-time steps for SmartScreen and Gatekeeper.",
      "closing.title": 'Open the <span class="accent">notebook.</span>',
      "closing.lede": "Your next story is one folder away.",
      "closing.cta": "Download Roleplay Manager",
      "closing.docs": "Read the docs first",
      "closing.note": "Free and open source · Windows, Linux and macOS",
      "footer.tagline":
        "A local-first notebook for long stories with AI characters.",
      "footer.product": "Product",
      "footer.docs": "Documentation",
      "footer.project": "Project",
      "footer.about": "What is it?",
      "footer.features": "Features",
      "footer.download": "Download",
      "footer.install": "Installation",
      "footer.guides": "Guides",
      "footer.reference": "Reference",
      "footer.github": "GitHub",
      "footer.releases": "Releases",
      "footer.issues": "Issues",
      "footer.license": "License",
      "footer.legal":
        "Code under AGPL-3.0-or-later. Made for writers, not for clouds.",
      "download.title": "Choose your system",
      "download.lede":
        "Every package is portable and includes Node.js. No installer, no account.",
      "download.win": "Windows",
      "download.winMeta": "Windows 10/11 · x64 · 62 MB",
      "download.mac": "macOS",
      "download.macMeta": "Apple Silicon or Intel · 60–62 MB",
      "download.linux": "Linux",
      "download.linuxMeta": "x64 or arm64 · 63–65 MB",
      "download.macArm": "macOS · Apple Silicon",
      "download.macArmMeta": "M1–M4 · 60 MB",
      "download.macIntel": "macOS · Intel",
      "download.macIntelMeta": "Intel · 62 MB",
      "download.linuxX64": "Linux · x64",
      "download.linuxX64Meta": "Most distros · 65 MB",
      "download.linuxArm64": "Linux · arm64",
      "download.linuxArm64Meta": "ARM boards · 65 MB",
      "download.recommended": "Recommended for you",
      "download.help":
        "Not sure? Windows x64 for most PCs, Apple Silicon for M1–M4, Linux x64 for most distros.",
      "download.all": "See all releases on GitHub",
      "download.close": "Close",
      "os.win.label": "Download for Windows",
      "os.win.meta": "Windows 10/11 · x64 · 62 MB",
      "os.mac.label": "Download for macOS",
      "os.mac.meta": "Apple Silicon or Intel · 60–62 MB",
      "os.linux.label": "Download for Linux",
      "os.linux.meta": "x64 or arm64 · 63–65 MB",
      "os.mobile.label": "Download for your PC",
      "os.mobile.meta": "Windows, Linux or macOS",
      "os.unknown.label": "Download",
      "os.unknown.meta": "Choose your system",
      "theme.light": "Light",
      "theme.dark": "Dark",
      "theme.system": "System",
      "theme.toggle": "Toggle light and dark mode",
      "copy.copy": "Copy",
      "copy.copied": "Copied",
      "docs.brandNote": "Documentation",
      "docs.search": "Search",
      "docs.searchPlaceholder": "Search the documentation…",
      "docs.searchHint": "Search by topic, error or feature.",
      "docs.searchEmpty": "No results. Try “install”, “Ollama” or “memory”.",
      "docs.menu": "Docs menu",
      "docs.toc": "On this page",
      "docs.edit": "Edit this page on GitHub",
      "docs.prev": "Previous",
      "docs.next": "Next",
      "docs.prevTitle": "Installation",
      "docs.nextTitle": "Linux and macOS",
      "docs.helpful": "Was this page helpful?",
      "docs.yes": "Yes",
      "docs.no": "No",
      "docs.thanks": "Thanks for the feedback.",
      "docs.download": "Download",
      "docs.sidebar.getting": "Getting started",
      "docs.sidebar.what": "What is Roleplay Manager?",
      "docs.sidebar.install": "Installation",
      "docs.sidebar.windows": "Windows",
      "docs.sidebar.linux": "Linux",
      "docs.sidebar.mac": "macOS",
      "docs.sidebar.first": "First steps",
      "docs.sidebar.updates": "Updating",
      "docs.sidebar.guides": "Guides",
      "docs.sidebar.characters": "Characters and versions",
      "docs.sidebar.chats": "Chats and branches",
      "docs.sidebar.memory": "Memory and summaries",
      "docs.sidebar.providers": "Providers",
      "docs.sidebar.custom": "Chat customization",
      "docs.sidebar.phone": "Phone access",
      "docs.sidebar.data": "Data and backups",
      "docs.sidebar.trouble": "Troubleshooting",
      "docs.sidebar.reference": "Reference",
      "docs.sidebar.settings": "Settings",
      "docs.sidebar.env": "Environment variables",
      "docs.sidebar.folder": "Portable folder",
      "docs.sidebar.format": "Character format",
      "docs.sidebar.glossary": "Glossary",
      "docs.sidebar.contrib": "Contributing",
      "docs.sidebar.dev": "Development",
      "docs.sidebar.arch": "Architecture",
      "docs.sidebar.releases": "Releases",
      "docs.sidebar.license": "License",
    },
    es: {
      "nav.docs": "Documentación",
      "nav.how": "Cómo funciona",
      "nav.features": "Funciones",
      "nav.download": "Descargar",
      "header.docs": "Documentación",
      "header.download": "Descargar",
      "header.menu": "Menú",
      "header.lang": "Idioma",
      "header.theme": "Tema",
      "header.github": "Repositorio en GitHub",
      "hero.title":
        'Tu historia vive <span class="accent">en tu equipo.</span>',
      "hero.lede":
        "Roleplay Manager es un cuaderno local-first para conversaciones largas con personajes de IA: personajes versionados, memoria real, ramas y tus datos en una carpeta que es tuya.",
      "hero.cta": "Descargar para Windows",
      "hero.other": "Otras plataformas",
      "hero.micro.version": "v1.47.0",
      "hero.micro.noNode": "Sin Node.js",
      "hero.micro.noAccount": "Sin cuenta",
      "hero.micro.size": "62 MB",
      "trust.1.title": "100% local",
      "trust.1.sub": "Tus datos viven en ./data",
      "trust.2.title": "Open source",
      "trust.2.sub": "AGPL-3.0 · sin telemetría",
      "trust.3.title": "Windows · Linux · macOS",
      "trust.3.sub": "Paquete portátil, sin instalador",
      "trust.4.title": "Tu proveedor",
      "trust.4.sub": "Ollama o compatible con OpenAI",
      "ledger.title": "Por qué se siente distinto.",
      "ledger.lede":
        "No es otro envoltorio de chat. Es un cuaderno que recuerda, en una máquina que controlas.",
      "ledger.1.label": "Local",
      "ledger.1.title": "Tu historia nunca sale de tu carpeta.",
      "ledger.1.body":
        "Personajes, chats, memorias e imágenes viven en una base SQLite dentro de data/. Mueve la carpeta, haz una copia o llévatela contigo.",
      "ledger.2.label": "Continuidad",
      "ledger.2.title": "Las historias largas no pierden el hilo.",
      "ledger.2.body":
        "Personajes versionados, memoria dinámica, resúmenes automáticos y ramas mantienen coherentes semanas de escritura.",
      "ledger.3.label": "Proveedor",
      "ledger.3.title": "Tú eliges la inteligencia.",
      "ledger.3.body":
        "Ejecuta Ollama en local o conecta cualquier endpoint compatible con OpenAI con tu propia clave. La app no te encierra.",
      "gallery.title": "Mira el cuaderno.",
      "gallery.lede":
        "Pantallas reales de la app. Sin mockups ni testimonios inventados.",
      "gallery.tab.library": "Biblioteca",
      "gallery.tab.chat": "Chat",
      "gallery.caption.library":
        "Personajes versionados con su propio arte, memoria y conversaciones.",
      "gallery.caption.chat":
        "Respuestas en streaming, mensajes editables y ramas cuando una escena toma otro camino.",
      "gallery.caption.note": "Captura de la app · contenido sintético",
      "steps.title": "De la descarga a la primera escena.",
      "steps.lede": "Sin Node.js, sin instalador, sin cuenta.",
      "steps.1.title": "Descarga y descomprime",
      "steps.1.body":
        "Elige el paquete de tu sistema. Guárdalo en una carpeta que recuerdes, como Documentos.",
      "steps.2.title": "Abre el lanzador",
      "steps.2.body":
        "Ejecuta start.cmd en Windows o ./start.sh en Linux y macOS. El navegador se abre en localhost:3001.",
      "steps.3.title": "Conecta tu IA",
      "steps.3.body":
        "Añade Ollama o un endpoint compatible con OpenAI, elige un modelo y crea tu primer personaje.",
      "steps.note":
        "El primer arranque puede mostrar un aviso del sistema porque la app no está firmada. La guía de instalación te acompaña.",
      "features.title": "Un cuaderno que recuerda.",
      "features.lede":
        "Los personajes evolucionan, las escenas se ramifican y la historia conserva su contexto.",
      "features.1.title": "Personajes versionados",
      "features.1.body":
        "Cada edición crea una versión nueva. Importa y exporta personajes como JSON portátil.",
      "features.2.title": "Ramas y rebobinado",
      "features.2.body":
        "Vuelve a cualquier mensaje, regenera una respuesta o abre una línea paralela sin perder la original.",
      "features.3.title": "Memoria y resúmenes",
      "features.3.body":
        "La memoria dinámica con desgaste y los resúmenes automáticos mantienen los chats largos dentro del contexto del modelo.",
      "features.4.title": "Tu forma de leer",
      "features.4.body":
        "Burbuja, documento o novela visual; cinco mundos de color; claro y oscuro.",
      "data.title": "Tus datos no viven en una nube.",
      "data.lede":
        "Viven en una carpeta que puedes abrir, copiar y respaldar. Las actualizaciones nunca la tocan.",
      "data.note":
        "Si usas un proveedor remoto, solo sale de tu equipo el prompt que envías. Si usas Ollama, la inferencia se queda en local.",
      "data.link": "Cómo funcionan los datos y las actualizaciones",
      "data.folderLabel": "Tu carpeta",
      "data.folderFoot":
        "Las actualizaciones cambian de versión y no tocan data/ ni backups/.",
      "phone.title": "Tu historia también cabe en el bolsillo.",
      "phone.lede":
        "La app se ejecuta en tu equipo. Tu teléfono la abre mediante un enlace privado, sin app nativa.",
      "phone.1":
        "Tailscale: acceso privado desde cualquier lugar, sin exponer nada a internet.",
      "phone.2": "Wi-Fi doméstica: ábrela desde el sofá en la misma red.",
      "phone.3": "Instálala como PWA con su propio icono y ventana.",
      "phone.cta": "Guía de acceso desde el teléfono",
      "docs.title": "El manual, sin letra pequeña.",
      "docs.lede":
        "Instalación, proveedores, memoria, ramas, copias y el teléfono. Buscable y escrito para personas.",
      "docs.1": "Instalar en Windows, Linux o macOS",
      "docs.1.desc": "Paquete portátil · sin Node.js",
      "docs.2": "Conectar Ollama o un proveedor compatible con OpenAI",
      "docs.2.desc": "Local o remoto · tu clave",
      "docs.3": "Crear un personaje y empezar tu primer chat",
      "docs.3.desc": "Versiones · saludos · tarjetas",
      "docs.4": "Usarla en el teléfono con Tailscale o LAN",
      "docs.4.desc": "Enlace privado · instalar PWA",
      "docs.cta": "Explorar la documentación",
      "faq.title": "Las preguntas que frenan a la gente.",
      "faq.lede": "Respuestas cortas antes de descargar.",
      "faq.1.q": "¿Es gratis?",
      "faq.1.a":
        "Sí. Roleplay Manager es gratis y open source bajo AGPL-3.0. Solo pagas a tu proveedor de IA si usas un endpoint de pago.",
      "faq.2.q": "¿Necesito Node.js?",
      "faq.2.a":
        "No. El paquete portátil incluye su propio runtime de Node. Solo necesitas Node si quieres desarrollar el proyecto.",
      "faq.3.q": "¿Necesito una API key?",
      "faq.3.a":
        "No si ejecutas Ollama en local. Para un proveedor remoto, usa tu propia clave.",
      "faq.4.q": "¿Dónde están mis personajes y chats?",
      "faq.4.a":
        "En data/ dentro de la carpeta de la app: una base SQLite y tus imágenes. Haz una copia de esa carpeta o mueve la app entera cuando quieras.",
      "faq.5.q": "¿Funcionará en mi equipo?",
      "faq.5.a":
        "Hay paquetes para Windows x64, Linux x64/arm64 y macOS Apple Silicon/Intel. Un sistema moderno de 64 bits es suficiente; una GPU solo importa si ejecutas modelos grandes en local.",
      "faq.6.q": "¿Hay app móvil?",
      "faq.6.a":
        "No hay app nativa. La app se ejecuta en tu equipo y el teléfono la abre por Tailscale o tu red doméstica. Puedes instalarla como PWA.",
      "faq.7.q": "¿Por qué me avisa Windows o macOS?",
      "faq.7.a":
        "Los binarios no están firmados. La guía de instalación explica los pasos de una sola vez para SmartScreen y Gatekeeper.",
      "closing.title": 'Abre el <span class="accent">cuaderno.</span>',
      "closing.lede": "Tu próxima historia está a una carpeta de distancia.",
      "closing.cta": "Descargar Roleplay Manager",
      "closing.docs": "Leer la documentación",
      "closing.note": "Gratis y open source · Windows, Linux y macOS",
      "footer.tagline":
        "Un cuaderno local-first para historias largas con personajes de IA.",
      "footer.product": "Producto",
      "footer.docs": "Documentación",
      "footer.project": "Proyecto",
      "footer.about": "¿Qué es?",
      "footer.features": "Funciones",
      "footer.download": "Descargar",
      "footer.install": "Instalación",
      "footer.guides": "Guías",
      "footer.reference": "Referencia",
      "footer.github": "GitHub",
      "footer.releases": "Releases",
      "footer.issues": "Issues",
      "footer.license": "Licencia",
      "footer.legal":
        "Código bajo AGPL-3.0-or-later. Hecho para escribir, no para nubes.",
      "download.title": "Elige tu sistema",
      "download.lede":
        "Todos los paquetes son portátiles e incluyen Node.js. Sin instalador, sin cuenta.",
      "download.win": "Windows",
      "download.winMeta": "Windows 10/11 · x64 · 62 MB",
      "download.mac": "macOS",
      "download.macMeta": "Apple Silicon o Intel · 60–62 MB",
      "download.linux": "Linux",
      "download.linuxMeta": "x64 o arm64 · 63–65 MB",
      "download.macArm": "macOS · Apple Silicon",
      "download.macArmMeta": "M1–M4 · 60 MB",
      "download.macIntel": "macOS · Intel",
      "download.macIntelMeta": "Intel · 62 MB",
      "download.linuxX64": "Linux · x64",
      "download.linuxX64Meta": "Distribuciones comunes · 65 MB",
      "download.linuxArm64": "Linux · arm64",
      "download.linuxArm64Meta": "Equipos ARM · 65 MB",
      "download.recommended": "Recomendado para ti",
      "download.help":
        "¿No lo sabes? Windows x64 para la mayoría de los equipos, Apple Silicon para M1–M4, Linux x64 para la mayoría de las distribuciones.",
      "download.all": "Ver todas las releases en GitHub",
      "download.close": "Cerrar",
      "os.win.label": "Descargar para Windows",
      "os.win.meta": "Windows 10/11 · x64 · 62 MB",
      "os.mac.label": "Descargar para macOS",
      "os.mac.meta": "Apple Silicon o Intel · 60–62 MB",
      "os.linux.label": "Descargar para Linux",
      "os.linux.meta": "x64 o arm64 · 63–65 MB",
      "os.mobile.label": "Descargar para tu PC",
      "os.mobile.meta": "Windows, Linux o macOS",
      "os.unknown.label": "Descargar",
      "os.unknown.meta": "Elige tu sistema",
      "theme.light": "Claro",
      "theme.dark": "Oscuro",
      "theme.system": "Sistema",
      "theme.toggle": "Cambiar entre modo claro y oscuro",
      "copy.copy": "Copiar",
      "copy.copied": "Copiado",
      "docs.brandNote": "Documentación",
      "docs.search": "Buscar",
      "docs.searchPlaceholder": "Buscar en la documentación…",
      "docs.searchHint": "Busca por tema, error o función.",
      "docs.searchEmpty":
        "Sin resultados. Prueba con «instalar», «Ollama» o «memoria».",
      "docs.menu": "Menú de documentación",
      "docs.toc": "En esta página",
      "docs.edit": "Editar esta página en GitHub",
      "docs.prev": "Anterior",
      "docs.next": "Siguiente",
      "docs.prevTitle": "Instalación",
      "docs.nextTitle": "Linux y macOS",
      "docs.helpful": "¿Te ha servido esta página?",
      "docs.yes": "Sí",
      "docs.no": "No",
      "docs.thanks": "Gracias por el aviso.",
      "docs.download": "Descargar",
      "docs.sidebar.getting": "Empezar",
      "docs.sidebar.what": "¿Qué es Roleplay Manager?",
      "docs.sidebar.install": "Instalación",
      "docs.sidebar.windows": "Windows",
      "docs.sidebar.linux": "Linux",
      "docs.sidebar.mac": "macOS",
      "docs.sidebar.first": "Primeros pasos",
      "docs.sidebar.updates": "Actualizar",
      "docs.sidebar.guides": "Guías",
      "docs.sidebar.characters": "Personajes y versiones",
      "docs.sidebar.chats": "Chats y ramas",
      "docs.sidebar.memory": "Memoria y resúmenes",
      "docs.sidebar.providers": "Proveedores",
      "docs.sidebar.custom": "Personalizar el chat",
      "docs.sidebar.phone": "Acceso desde el teléfono",
      "docs.sidebar.data": "Datos y copias",
      "docs.sidebar.trouble": "Solución de problemas",
      "docs.sidebar.reference": "Referencia",
      "docs.sidebar.settings": "Ajustes",
      "docs.sidebar.env": "Variables de entorno",
      "docs.sidebar.folder": "Carpeta portátil",
      "docs.sidebar.format": "Formato de personaje",
      "docs.sidebar.glossary": "Glosario",
      "docs.sidebar.contrib": "Contribuir",
      "docs.sidebar.dev": "Desarrollo",
      "docs.sidebar.arch": "Arquitectura",
      "docs.sidebar.releases": "Releases",
      "docs.sidebar.license": "Licencia",
    },
  }

  const get = (path) => {
    const lang = root.dataset.lang === "es" ? "es" : "en"
    if (copy[lang] && path in copy[lang]) return copy[lang][path]
    if (path in copy.en) return copy.en[path]
    return undefined
  }

  const setText = (element, value) => {
    if (value != null) element.innerHTML = value
  }

  const platformAssets = {
    "win-x64":
      "https://github.com/TheFallen0000/roleplay-manager/releases/download/v1.47.0/roleplay-manager-1.47.0-win-x64.zip",
    "linux-x64":
      "https://github.com/TheFallen0000/roleplay-manager/releases/download/v1.47.0/roleplay-manager-1.47.0-linux-x64.tar.gz",
    "linux-arm64":
      "https://github.com/TheFallen0000/roleplay-manager/releases/download/v1.47.0/roleplay-manager-1.47.0-linux-arm64.tar.gz",
    "mac-arm64":
      "https://github.com/TheFallen0000/roleplay-manager/releases/download/v1.47.0/roleplay-manager-1.47.0-mac-arm64.tar.gz",
    "mac-x64":
      "https://github.com/TheFallen0000/roleplay-manager/releases/download/v1.47.0/roleplay-manager-1.47.0-mac-x64.tar.gz",
  }

  function applyLang(lang, persist = false) {
    if (lang !== "es") lang = "en"
    root.dataset.lang = lang
    root.lang = lang
    if (persist) localStorage.setItem(LANG_KEY, lang)

    $$("[data-i18n]").forEach((el) => {
      const value = get(el.dataset.i18n)
      if (value != null) el.textContent = value
    })
    $$("[data-i18n-html]").forEach((el) => {
      const value = get(el.dataset.i18nHtml)
      if (value != null) el.innerHTML = value
    })
    $$("[data-i18n-aria]").forEach((el) => {
      const value = get(el.dataset.i18nAria)
      if (value != null) el.setAttribute("aria-label", value)
    })
    $$("[data-i18n-placeholder]").forEach((el) => {
      const value = get(el.dataset.i18nPlaceholder)
      if (value != null) el.setAttribute("placeholder", value)
    })
    $$("[data-lang-set]").forEach((el) => {
      el.setAttribute("aria-pressed", String(el.dataset.langSet === lang))
    })
    $$("[data-docs-link]").forEach((el) => {
      const base = el.dataset.docsLink
      el.setAttribute("href", `${base}?lang=${lang}`)
    })
    applyOS()
    document.dispatchEvent(
      new CustomEvent("rm:langchange", { detail: { lang } })
    )
  }

  function detectOS() {
    const ua = navigator.userAgent || ""
    const platform =
      navigator.userAgentData?.platform || navigator.platform || ""
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Mac/i.test(platform))
    if (mobile) return { key: "mobile", mobile: true }
    if (/Win/i.test(platform) || /Windows/i.test(ua))
      return { key: "win", mobile: false }
    if (/Mac/i.test(platform) || /Mac OS X/i.test(ua))
      return { key: "mac", mobile: false }
    if (/Linux|X11/i.test(platform) || /Linux/i.test(ua))
      return { key: "linux", mobile: false }
    return { key: "unknown", mobile: false }
  }

  function applyOS() {
    const primary = $("[data-download-primary]")
    if (!primary) return
    const os = detectOS()
    const label = $("[data-os-label]")
    const meta = $("[data-os-meta]")
    const key = os.key === "mobile" || os.key === "unknown" ? os.key : os.key
    const labels = {
      win: "os.win.label",
      mac: "os.mac.label",
      linux: "os.linux.label",
      mobile: "os.mobile.label",
      unknown: "os.unknown.label",
    }
    const metas = {
      win: "os.win.meta",
      mac: "os.mac.meta",
      linux: "os.linux.meta",
      mobile: "os.mobile.meta",
      unknown: "os.unknown.meta",
    }
    if (label) label.textContent = get(labels[key])
    if (meta) meta.textContent = get(metas[key])

    const direct = key === "win" ? platformAssets["win-x64"] : null
    primary.dataset.direct = direct ? "true" : "false"
    primary.href = direct || "#platforms"

    $$("[data-platform]").forEach((el) => {
      const recommended =
        el.dataset.platform ===
        (key === "win"
          ? "win-x64"
          : key === "mac"
            ? "mac-arm64"
            : key === "linux"
              ? "linux-x64"
              : "")
      const badge = $(".rec", el)
      if (badge) badge.hidden = !recommended
    })
  }

  function applyTheme(theme, persist = false) {
    if (!["light", "dark", "system"].includes(theme)) theme = "system"
    const dark = theme === "dark" || (theme === "system" && mq.matches)
    root.classList.toggle("dark", dark)
    root.dataset.theme = theme
    if (persist) localStorage.setItem(THEME_KEY, theme)
    $$("[data-theme-set]").forEach((el) => {
      el.setAttribute("aria-pressed", String(el.dataset.themeSet === theme))
    })
    const toggle = $("[data-theme-toggle]")
    if (toggle) toggle.setAttribute("aria-label", get("theme.toggle"))
  }

  function toggleTheme() {
    const dark = root.classList.contains("dark")
    applyTheme(dark ? "light" : "dark", true)
  }

  function openDialog(dialog) {
    if (!dialog) return
    if (typeof dialog.showModal === "function") dialog.showModal()
    else dialog.setAttribute("open", "")
    const focusable = $("button, a, input", dialog)
    focusable?.focus()
  }

  function closeDialog(dialog) {
    if (!dialog) return
    if (typeof dialog.close === "function") dialog.close()
    else dialog.removeAttribute("open")
  }

  function initDialogs() {
    $$("[data-open-platforms]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault()
        openDialog($("#platforms"))
      })
    })
    $$("[data-open-search]").forEach((button) => {
      button.addEventListener("click", () => openDialog($("#search-dialog")))
    })
    $$("dialog").forEach((dialog) => {
      $$("[data-dialog-close]", dialog).forEach((button) => {
        button.addEventListener("click", () => closeDialog(dialog))
      })
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog)
      })
    })
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY) || "system"
    applyTheme(stored)
    $$("[data-theme-toggle]").forEach((button) =>
      button.addEventListener("click", toggleTheme)
    )
    $$("[data-theme-set]").forEach((button) => {
      button.addEventListener("click", () =>
        applyTheme(button.dataset.themeSet, true)
      )
    })
    mq.addEventListener?.("change", () => {
      if ((localStorage.getItem(THEME_KEY) || "system") === "system")
        applyTheme("system")
    })
  }

  function initLang() {
    applyLang(root.dataset.lang || localStorage.getItem(LANG_KEY) || "en")
    $$("[data-lang-set]").forEach((button) => {
      button.addEventListener("click", () =>
        applyLang(button.dataset.langSet, true)
      )
    })
  }

  function initHeader() {
    const toggle = $("[data-menu-toggle]")
    const menu = $("#mobile-menu")
    if (toggle && menu) {
      const setOpen = (open) => {
        menu.hidden = !open
        toggle.setAttribute("aria-expanded", String(open))
      }
      toggle.addEventListener("click", () => setOpen(menu.hidden))
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

    const primary = $("[data-download-primary]")
    primary?.addEventListener("click", (event) => {
      if (primary.dataset.direct !== "true") {
        event.preventDefault()
        openDialog($("#platforms"))
      }
    })
  }

  function initGallery() {
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

  function normalize(value) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  }

  function initSearch() {
    const dialog = $("#search-dialog")
    const input = $("#search-input")
    if (!dialog || !input) return
    const results = $$(".search-result", dialog)
    const empty = $(".search-empty", dialog)
    const filter = () => {
      const needle = normalize(input.value.trim())
      const lang = root.dataset.lang === "es" ? "es" : "en"
      let visible = 0
      results.forEach((result) => {
        const block = result.closest("[data-lang-block]")
        if (block && block.dataset.langBlock !== lang) {
          result.hidden = true
          return
        }
        const match =
          !needle ||
          normalize(result.dataset.search || result.textContent).includes(
            needle
          )
        result.hidden = !match
        if (match) visible += 1
      })
      if (empty) empty.hidden = visible > 0
    }
    input.addEventListener("input", filter)
    document.addEventListener("rm:langchange", filter)
    document.addEventListener("keydown", (event) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(target.tagName)
      if (
        (event.key === "/" && !typing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault()
        openDialog(dialog)
        setTimeout(() => input.focus(), 30)
      }
    })
    dialog.addEventListener("close", () => {
      input.value = ""
      filter()
    })
  }

  function initCopy() {
    $$("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.dataset.copy || ""
        const label = $("[data-copy-label]", button)
        const original = label?.textContent || ""
        try {
          await navigator.clipboard.writeText(value)
          if (label) label.textContent = get("copy.copied")
        } catch {
          if (label) label.textContent = get("copy.copied")
        }
        button.dataset.copied = "true"
        setTimeout(() => {
          if (label) label.textContent = get("copy.copy") || original
          delete button.dataset.copied
        }, 1600)
      })
    })
  }

  function initFeedback() {
    $$("[data-feedback]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.closest(".docs-feedback")
        $$("[data-feedback]", group).forEach((other) =>
          other.setAttribute("aria-pressed", "false")
        )
        button.setAttribute("aria-pressed", "true")
        const thanks = $(".thanks", group)
        if (thanks) thanks.hidden = false
      })
    })
  }

  function initDocsMenu() {
    const toggle = $("[data-docs-menu]")
    const sidebar = $(".docs-sidebar")
    const overlay = $(".docs-overlay")
    if (!toggle || !sidebar || !overlay) return
    const setOpen = (open) => {
      sidebar.classList.toggle("is-open", open)
      overlay.classList.toggle("is-open", open)
      toggle.setAttribute("aria-expanded", String(open))
    }
    toggle.addEventListener("click", () =>
      setOpen(!sidebar.classList.contains("is-open"))
    )
    overlay.addEventListener("click", () => setOpen(false))
    $$("a", sidebar).forEach((link) =>
      link.addEventListener("click", () => setOpen(false))
    )
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false)
    })
  }

  function initToc() {
    const links = $$(".docs-toc a")
    if (!links.length) return
    const headings = links
      .map((link) =>
        document.getElementById(link.getAttribute("href").slice(1))
      )
      .filter(Boolean)
    if (!("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          links.forEach((link) => {
            link.setAttribute(
              "aria-current",
              String(link.getAttribute("href") === `#${entry.target.id}`)
            )
          })
        })
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 1] }
    )
    headings.forEach((heading) => observer.observe(heading))
  }

  function initYear() {
    $$("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear())
    })
  }

  initTheme()
  initLang()
  initDialogs()
  initHeader()
  initGallery()
  initSearch()
  initCopy()
  initFeedback()
  initDocsMenu()
  initToc()
  initYear()

  /* Prototype-only deep links for screenshots and review. */
  const params = new URLSearchParams(location.search)
  const tab = params.get("tab")
  if (tab) $(`[data-gallery-tab="${tab}"]`)?.click()
  if (params.get("dialog") === "platforms") {
    setTimeout(() => openDialog($("#platforms")), 120)
  }
  if (params.get("dialog") === "search") {
    setTimeout(() => {
      openDialog($("#search-dialog"))
      const input = $("#search-input")
      if (input) {
        input.value = params.get("q") || ""
        input.dispatchEvent(new Event("input"))
        input.focus()
      }
    }, 120)
  }
})()
