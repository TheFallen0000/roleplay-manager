import type { TranslationKey } from "./en"

export const es: Record<TranslationKey, string> = {
  "skip.link": "Saltar al contenido",
  "nav.docs": "Documentación",
  "nav.how": "Cómo funciona",
  "nav.features": "Funciones",
  "nav.download": "Descargar",
  "header.download": "Descargar",
  "header.menu": "Menú",
  "header.lang": "Idioma",
  "header.theme": "Tema",
  "header.github": "Repositorio en GitHub",
  "theme.light": "Claro",
  "theme.dark": "Oscuro",
  "theme.system": "Sistema",
  "theme.toggle": "Cambiar entre modo claro y oscuro",

  "hero.title": 'Tu historia vive <span class="accent">en tu equipo.</span>',
  "hero.lede":
    "Roleplay Manager es un cuaderno local-first para conversaciones largas con personajes de IA: personajes versionados, memoria real, ramas y tus datos en una carpeta que es tuya.",
  "hero.other": "Otras plataformas",
  "hero.micro.version": "v1.47.0",
  "hero.micro.noNode": "Sin Node.js",
  "hero.micro.noAccount": "Sin cuenta",
  "hero.imageAlt":
    "Chat de Roleplay Manager con un personaje en estilo novela visual",
  "hero.mascotAlt": "Mascota de Roleplay Manager sosteniendo un cartel RM",

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
  "gallery.imageAlt.library":
    "Biblioteca de personajes con dos personajes e insignias de versión",
  "gallery.imageAlt.chat":
    "Chat con respuestas en streaming y colores de diálogo",

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
  "features.imageAlt": "Biblioteca de personajes en Roleplay Manager",

  "data.title": "Tus datos no viven en una nube.",
  "data.lede":
    "Viven en una carpeta que puedes abrir, copiar y respaldar. Las actualizaciones nunca la tocan.",
  "data.note":
    "Si usas un proveedor remoto, solo sale de tu equipo el prompt que envías. Si usas Ollama, la inferencia se queda en local.",
  "data.link": "Cómo funcionan los datos y las actualizaciones",
  "data.folderLabel": "Tu carpeta",
  "data.folderFoot":
    "Las actualizaciones cambian de versión y no tocan data/ ni backups/.",
  "data.folderStory": "tu historia",
  "data.folderBackups": "copias de seguridad",
  "data.folderVersions": "versiones instaladas",

  "phone.title": "Tu historia también cabe en el bolsillo.",
  "phone.lede":
    "La app corre en tu ordenador. Tu teléfono la abre mediante un enlace privado, sin app nativa.",
  "phone.1":
    "Tailscale: acceso privado desde cualquier lugar, sin exponer nada a internet.",
  "phone.2": "WiFi doméstica: ábrela desde el sofá en la misma red.",
  "phone.3": "Instálala como PWA con su propio icono y ventana.",
  "phone.cta": "Guía de acceso desde el teléfono",
  "phone.imageAlt": "Chat de Roleplay Manager en un teléfono",

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
    "No hay app nativa. La app corre en tu ordenador y el teléfono la abre por Tailscale o tu red doméstica. Puedes instalarla como PWA.",
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
  "download.macArm": "macOS · Apple Silicon",
  "download.macArmMeta": "M1–M4 · 60 MB",
  "download.macIntel": "macOS · Intel",
  "download.macIntelMeta": "Intel · 62 MB",
  "download.linuxX64": "Linux · x64",
  "download.linuxX64Meta": "La mayoría de distros · 65 MB",
  "download.linuxArm64": "Linux · arm64",
  "download.linuxArm64Meta": "Placas ARM · 65 MB",
  "platform.win": "Windows 10/11 · x64",
  "platform.macArm": "Apple Silicon · M1–M4",
  "platform.macIntel": "Intel",
  "platform.linuxX64": "x64 · la mayoría de distros",
  "platform.linuxArm64": "arm64 · placas ARM",
  "download.recommended": "Recomendado para ti",
  "download.help":
    "¿No lo sabes? Windows x64 para la mayoría de PCs, Apple Silicon para M1–M4, Linux x64 para la mayoría de distros.",
  "download.all": "Ver todas las releases en GitHub",
  "download.close": "Cerrar",

  "downloadPage.title": "Descargar Roleplay Manager",
  "downloadPage.lede":
    "Elige el paquete portátil para tu ordenador. Sin instalador, sin Node.js, sin cuenta.",
  "downloadPage.requirements": "Antes de empezar",
  "downloadPage.req.os": "Sistema",
  "downloadPage.req.osValue": "Windows 10/11, Linux o macOS (64 bits)",
  "downloadPage.req.disk": "Disco",
  "downloadPage.req.diskValue": "Unos 200 MB después de descomprimir",
  "downloadPage.req.node": "Node.js",
  "downloadPage.req.nodeValue": "No hace falta: el runtime va incluido",
  "downloadPage.req.account": "Cuenta",
  "downloadPage.req.accountValue": "Ninguna. Todo vive en tu carpeta.",
  "downloadPage.firstRunTitle": "El primer arranque",
  "downloadPage.firstRunBody":
    "Descomprime el paquete, ejecuta start.cmd o ./start.sh y abre http://localhost:3001 si el navegador no se abre solo.",
  "downloadPage.winWarningTitle":
    "Windows puede mostrar un aviso de SmartScreen",
  "downloadPage.winWarningBody":
    "El lanzador no está firmado. Si lo descargaste desde la release oficial de GitHub, elige Más información → Ejecutar de todas formas. Es un paso único.",
  "downloadPage.macWarningTitle": "macOS puede bloquear el primer arranque",
  "downloadPage.macWarningBody":
    "El runtime incluido no está firmado. Permítelo en Ajustes del Sistema → Privacidad y seguridad, o ejecuta xattr -dr com.apple.quarantine . dentro de la carpeta.",
  "downloadPage.linuxWarningTitle": "Permisos del lanzador en Linux",
  "downloadPage.linuxWarningBody":
    "Si start.sh no se ejecuta, dale permiso con chmod +x start.sh dentro de la carpeta de la app.",
  "downloadPage.docs": "Leer la guía de instalación",
  "downloadPage.allReleases": "Ver todas las releases en GitHub",
  "downloadPage.version": "Última versión",
  "downloadPage.updated": "Publicada",
  "downloadPage.platform": "Plataforma",
  "downloadPage.arch": "Arquitectura",
  "downloadPage.size": "Descarga",
  "downloadPage.note":
    "Mantén la carpeta completa: data/, backups/, versions/ y el lanzador viven dentro.",
  "downloadPage.backHome": "Volver a la portada",

  "docsPage.title": "Documentación",
  "docsPage.lede":
    "La documentación completa se está escribiendo para el sitio público. Por ahora, el README tiene las guías de instalación, proveedores y acceso desde el teléfono.",
  "docsPage.body":
    "S83 traerá un centro de documentación bilingüe y buscable con instalación por sistema, proveedores, personajes, memoria, ramas, datos y actualizaciones.",
  "docsPage.readme": "Abrir el README",
  "docsPage.install": "Instalación",
  "docsPage.providers": "Configurar un proveedor",
  "docsPage.phone": "Acceso desde el teléfono",
  "docsPage.back": "Volver a la portada",
}
