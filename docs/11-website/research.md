# Investigación — presentación y documentación web

**Fecha:** 2026-10-23.
**Objeto:** decidir cómo presentar Roleplay Manager a personas que no leen un
README técnico, y cómo organizar la documentación para que puedan instalar,
configurar y disfrutar la app sin miedo.

---

## 1. Encargo y método

La situación de partida es conocida: el proyecto solo se explica en GitHub. El
README contiene la información correcta, pero está escrito para alguien que ya
sabe qué es un repositorio, una release, un ZIP y Node.js. El usuario final de
Roleplay Manager no tiene por qué saber nada de eso.

Se analizaron dos referencias con estrategias complementarias:

- **GameNative** (`gamenative.app`): una portada de producto que convierte en
  segundos y reduce la descarga a un botón.
- **SillyTavern Docs** (`docs.sillytavern.app`): una documentación profunda,
  navegable y organizada por tareas.

El objetivo no es copiar ninguna de las dos, sino quedarse con la mecánica de
cada una y vestirla con la identidad «Ink & Violet» que ya existe en la app.

---

## 2. GameNative: la lección de la acción única

### Qué hace bien

1. **El hero dice qué es y para qué sirve en una línea.** «Your PC games.» y una
   frase que explica el resto: instala la app, inicia sesión en Steam/Epic/GOG y
   juega en tu Android. No hay jerga antes del CTA.
2. **Una sola acción principal, repetida con coherencia.** «Get the app» en el
   header, la store en el hero y el mismo CTA al final. La acción secundaria
   («Check compatibility») no compite: resuelve una duda concreta.
3. **Descarga directa y transparente.** Bajo el botón de Google Play aparecen
   `Open source · v1.3.0 · No Google Play? Download the APK`. En tres líneas
   resuelve versión, licencia y una alternativa para quien no usa la tienda.
4. **«How it works» en tres pasos.** Instalar, añadir juegos, jugar. Es
   exactamente el nivel de detalle que necesita alguien antes de descargar.
5. **Prueba social masiva.** Testimonios, vídeos de YouTube, prensa. Funciona
   porque el proyecto tiene años de comunidad y material real.
6. **Móvil primero de verdad.** El producto es una app Android; el CTA del
   teléfono lleva a la tienda. La página no obliga a leer para actuar.

### Qué no trasladar

- **No tenemos prueba social.** `PRODUCT.md` lo dice: no hay testimonios,
  clientes, benchmarks ni material de prensa. Inventarlos sería una traición al
  producto y se detectaría. La confianza tiene que venir de otra parte: capturas
  reales, datos verificables, licencia, carpeta `data/`, avisos del sistema
  explicados.
- **No hay tienda de apps.** Roleplay Manager es una app local con paquete
  portátil. La descarga debe resolverse con GitHub Releases y un selector de
  plataforma claro, no con un botón de App Store.
- **La estética gaming oscura no es la nuestra.** La identidad es papel, tinta y
  violeta; el dorado aparece una vez. Copiar el negro con neón rompería el
  sistema.

### Diferencia crítica: el visitante móvil

GameNative puede decir «descarga la app» a un teléfono porque su producto _es_
una app Android. Roleplay Manager no: **el servidor corre en el PC y el móvil es
un cliente que lo abre por Tailscale o LAN**.

Si una persona entra desde el móvil y ve «Descargar para Windows», el mensaje es
incorrecto y genera abandono. La portada debe:

- Detectar que el visitante está en un dispositivo móvil.
- Cambiar el CTA a «Descargar para tu PC» / «Download for your PC».
- Abrir el selector de sistema en vez de descargar un ZIP que no puede ejecutar.
- Ofrecer una segunda vía: «¿Ya la tienes? Abrir en el móvil», que lleva a la
  guía de Tailscale/LAN/PWA.

Esto es una decisión de producto, no un detalle de responsive.

---

## 3. SillyTavern Docs: la lección de la documentación por tareas

### Qué hace bien

1. **La portada de docs responde «¿qué es esto?» antes de pedir nada.** Banner,
   explicación, capturas, requisitos, instalación por plataforma, ramas,
   funciones clave, extensiones, comunidad y licencia.
2. **Navegación lateral jerárquica y buscable.** Instalación, uso, extensiones,
   administración. El lector siempre sabe en qué categoría está.
3. **Instalación por sistema operativo.** Windows, Linux/macOS, Android (Termux)
   y Docker, cada uno con su guía. No hay un «instala Node y ya verás».
4. **Requisitos explícitos.** «Cualquier cosa que ejecute NodeJS 20 o superior»;
   si haces inferencia local, una GPU NVIDIA de la serie 3000 con 6 GB de VRAM.
   El lector puede decidir si su equipo sirve antes de empezar.
5. **Recomendación por rama.** `release` para la mayoría, `staging` solo para
   power users. Es un buen ejemplo de cómo evitar que el usuario elija mal.
6. **Enlaces internos por todas partes.** Cada función conecta con su guía; el
   lector no tiene que volver al inicio.
7. **Screenshots y bloques de texto cortos.** La documentación es densa, pero
   está troceada.

### Qué no trasladar

- **La densidad inicial.** La portada de SillyTavern es un manual; para alguien
  que solo quiere saber si esto es para él, es demasiado. En nuestra portada, la
  documentación es una segunda capa, no el primer muro.
- **Jerga sin glosario.** «LLM», «API», «branch», «staging» se explican o se
  sustituyen por lenguaje de usuario. Un glosario en docs es obligatorio.
- **Navegación pensada para escritorio.** En móvil, la sidebar debe convertirse
  en un drawer claro y la búsqueda debe estar a un toque.
- **La descarga enterrada.** SillyTavern no tiene un botón de descarga grande en
  el hero. Nosotros sí: la portada es Persuade, los docs son Read.

### Motor

SillyTavern usa **Retype**. No lo copiaría: añade otro stack y otra identidad.
El proyecto ya usa **Astro 7.3.5**; **Starlight 0.42.6** es compatible
(`peerDependencies: astro ^7.2.10`) y trae navegación, Pagefind, i18n, modo
oscuro, TOC, código con copiar y una base móvil decente. La personalización
visual se hace con CSS y tokens.

---

## 4. Comparativa

| Dimensión             | GameNative          | SillyTavern Docs               | Nuestra síntesis                                |
| --------------------- | ------------------- | ------------------------------ | ----------------------------------------------- |
| Trabajo del visitante | Decidir y descargar | Entender e instalar            | Portada para decidir; docs para instalar        |
| Acción principal      | Una, repetida       | Ninguna (es docs)              | Descargar, repetida en header/hero/cierre       |
| Prueba                | Social proof        | Capturas y requisitos          | Capturas reales + transparencia + licencia      |
| Móvil                 | App Android nativa  | Docs responsive, desktop-first | Portada mobile-first; móvil como cliente del PC |
| Idioma                | Inglés              | Inglés                         | Inglés canónico + español completo              |
| Descarga              | Google Play + APK   | Instalación manual             | Detección de SO + selector de 5 paquetes        |
| Profundidad           | Poca, deliberada    | Mucha                          | Dos capas: 30 segundos / 5 minutos / referencia |

---

## 5. Restricciones y verdad del producto

Antes de diseñar, estas son las cosas que no se pueden inventar ni contradecir:

- **Local-first:** personajes, conversaciones, memorias, resúmenes e imágenes
  viven en SQLite y en `./data` del usuario. No hay cuentas ni nube propia.
- **BYO provider:** Ollama local o cualquier endpoint compatible con OpenAI con
  la clave del usuario. La app no impone proveedor.
- **Continuidad:** versiones de personaje, memoria dinámica con decaimiento,
  resúmenes automáticos, ramas y rebobinado. Es la función, no un extra.
- **Nada se pierde sin querer:** operaciones destructivas con confirmación,
  export/import completo, actualizador con respaldo y rollback.
- **Licencia:** AGPL-3.0-or-later. Es un compromiso legal, no un adorno de
  footer.
- **Sin testimonios, prensa ni benchmarks.** No existen; no se fabrican.
- **Bilingüe:** la app está en inglés y español. El sitio debe tener paridad real.
- **Identidad:** «Tinta viva» — papel frío, tinta violeta, filos de 1 px, sin
  degradados decorativos, sin glass, grano de papel como única textura, un solo
  destello dorado para hitos, mascota una vez por superficie.
- **Tipografía:** Dela Gothic para el nombre y momentos grandes; Zen Maru para
  títulos; Zen Kaku para leer.
- **Web y app no son lo mismo:** la web puede usar cuerpos de 16–18 px y más aire;
  la app prioriza densidad operativa.

---

## 6. Hallazgos de UX móvil

La portada se diseña primero a **360 px** y luego se amplía. Decisiones:

1. **CTA antes que mascota.** En móvil, el H1, el subtítulo y el botón caben en
   el primer viewport. La mascota y la captura van después. La mascota no debe
   empujar la acción fuera de pantalla.
2. **Un solo botón primario.** En móvil, ocupa el ancho completo y mide ≥52 px.
   El secundario («Otras plataformas») también es grande, pero visualmente
   subordinado.
3. **El botón dice la verdad.** «Descargar para tu PC» si el visitante está en
   un teléfono; «Descargar para Windows/Linux/macOS» si está en escritorio.
4. **Selector de plataforma en bottom sheet.** Cinco filas, icono, nombre,
   arquitectura y tamaño; la opción detectada lleva «Recomendado para ti».
5. **Avisos del sistema a la vista.** Windows SmartScreen y macOS Gatekeeper son
   la causa número uno de abandono en el primer arranque. La portada los menciona
   y enlaza a la guía; la guía los explica paso a paso.
6. **Nada de hover como única affordance.** Todos los controles tienen estado
   `:active`, foco visible y área táctil ≥44 px.
7. **Texto legible sin zoom.** Inputs a 16 px; cuerpo ≥16 px; metadatos ≥12 px.
8. **Rendimiento como parte del diseño.** Sin React, sin vídeo autoplay, sin
   fuentes de terceros en producción, sin analítica por defecto. Presupuesto:
   JS < 30 KB gzip, CSS < 30 KB, LCP < 2.5 s en 4G.
9. **Capturas reales, no mockups.** La app se explica enseñando la app. Las
   capturas actuales son de escritorio y móvil, con contenido sintético; sirven
   para el prototipo, pero producción necesita versiones EN/ES.
10. **Un solo momento expresivo.** El cursor-pincel de streaming y el destello
    dorado de versión; no animar cada sección.

---

## 7. Detección de idioma

El requisito es inglés por defecto y español automático si el visitante viene de
una región hispanohablante, sin quitarle el control.

### Señales disponibles

| Señal                                     | Precisión                                           | Privacidad            | Coste                    |
| ----------------------------------------- | --------------------------------------------------- | --------------------- | ------------------------ |
| `navigator.languages` / `Accept-Language` | Alta para preferencia lingüística                   | Alta (local)          | Ninguno                  |
| Zona horaria (`Intl.DateTimeFormat`)      | Media para región; falla en fronteras y expatriados | Alta (local)          | Ninguno                  |
| `CF-IPCountry` (Cloudflare)               | Alta para país                                      | Media (IP en el edge) | Requiere Function/Worker |
| `Accept-Language` del navegador           | Alta para idioma, no para país                      | Alta                  | Ninguno                  |

### Recomendación

- **Inglés canónico** en `/`, español en `/es/`. `hreflang` recíproco y
  `x-default` para inglés.
- **Primera visita:** un script pequeño en `<head>` (o un middleware de
  Cloudflare, si se opta por geo) comprueba `localStorage`/cookie; si no hay
  elección, usa `navigator.languages` y, como refuerzo, la zona horaria. Si la
  señal es española, redirige una vez a `/es/`.
- **Elección manual manda siempre.** El toggle guarda la preferencia y no se
  vuelve a autodetectar.
- **No hacer redirects por IP a ciegas.** Un visitante en México con el navegador
  en inglés puede preferir inglés. La geo solo debe usarse para una sugerencia
  o para reforzar la señal, no para imponer.
- **SEO:** el contenido debe existir estático en ambas rutas; nada de servir
  inglés y traducir con JS. Los bots deben ver `hreflang` y canonical correctos.
- **Prototipo:** implementa la heurística con `navigator.languages` + zona
  horaria y bloques `data-lang-block`; la elección se guarda en `localStorage`.
  Producción la moverá a rutas reales.

---

## 8. Descarga: lo que hay que resolver

La release actual `v1.47.0` publica cinco assets:

| Plataforma          | Asset                                        | Tamaño |
| ------------------- | -------------------------------------------- | ------ |
| Windows x64         | `roleplay-manager-1.47.0-win-x64.zip`        | ~62 MB |
| Linux x64           | `roleplay-manager-1.47.0-linux-x64.tar.gz`   | ~65 MB |
| Linux arm64         | `roleplay-manager-1.47.0-linux-arm64.tar.gz` | ~65 MB |
| macOS Apple Silicon | `roleplay-manager-1.47.0-mac-arm64.tar.gz`   | ~60 MB |
| macOS Intel         | `roleplay-manager-1.47.0-mac-x64.tar.gz`     | ~62 MB |

Datos que el usuario necesita antes de pulsar:

- **No hace falta Node.js.** El runtime va incluido.
- **No hay instalador.** Se descomprime y se ejecuta `start.cmd` o `start.sh`.
- **Ocupa ~200 MB descomprimido.**
- **No pide cuenta.**
- **Los datos viven en `data/`** y las actualizaciones no los tocan.
- **Windows/macOS pueden avisar** porque el binario no está firmado. Hay que
  explicar el paso único, no esconderlo.
- **macOS:** Apple Silicon vs Intel; Linux: x64 vs arm64. El selector debe ayudar
  a elegir, no soltar cinco archivos sin contexto.

La API de GitHub ofrece `browser_download_url` y `size`. En build time se puede
generar un JSON con versión, assets y tamaños; si la API falla, se usa un fallback
versionado y se enlaza a `/releases/latest`. Nunca hacer que la portada dependa de
una llamada frágil en el navegador.

---

## 9. Auditoría del contenido existente

| Fuente                                                     | Qué aporta                                                                                       | Destino                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `README.md` / `README.es.md`                               | Instalación, requisitos, actualizaciones, acceso móvil, desarrollo, licencia.                    | Instalación, primeros pasos, datos, FAQ y contribución.                                       |
| `docs/packaging-opt.md`                                    | Contrato del paquete, `data/`, `backups/`, `versions/`, actualizador, avisos de primer arranque. | Guías de instalación, datos y actualizaciones.                                                |
| `docs/remote-access-opt.md`                                | Tailscale, LAN, QR, PWA, seguridad.                                                              | Guía de acceso desde el teléfono.                                                             |
| `docs/07-technical-architecture.md` + `AGENTS.md`          | Arquitectura, tests, quality gates, release.                                                     | Sección Contribuir.                                                                           |
| 9 tutoriales de la app (`content.es.ts` / `content.en.ts`) | Lenguaje cercano y pasos reales de la UI.                                                        | Base de las guías de personajes, ramas, memoria, proveedores, personalización, datos y móvil. |
| `CHANGELOG.md`                                             | Historial real.                                                                                  | Enlace a Releases; no duplicar un changelog completo al principio.                            |
| `DESIGN.md`                                                | Tokens, tipografía, reglas de color, componentes.                                                | Sistema visual del sitio.                                                                     |
| `PRODUCT.md`                                               | Usuarios, propósito, posicionamiento, límites.                                                   | Copy y criterios de verdad.                                                                   |

**Regla de mantenimiento:** cuando cambie una pantalla o un menú, se actualizan
el tutorial de la app y la página de docs. Si no, las capturas y los pasos se
quedan viejos. Añadir esta regla a `AGENTS.md` en S83.

---

## 10. Riesgos y mitigaciones

| Riesgo                                   | Impacto                        | Mitigación                                                                                            |
| ---------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Duplicación docs web / tutoriales in-app | Drift y doble mantenimiento    | Guías web como fuente larga; tutoriales como referencia rápida; checklist en `AGENTS.md`.             |
| Capturas desactualizadas                 | Pérdida de confianza           | Script de captura con datos sintéticos y revisión por release.                                        |
| Traducción a medias                      | Mala experiencia ES            | Paridad obligatoria: una página no se publica si falta su versión.                                    |
| API de GitHub caída o rate limit         | Descarga rota                  | Snapshot en build + fallback + enlace a releases.                                                     |
| Avisos de SmartScreen/Gatekeeper         | Abandono en el primer arranque | Explicarlos en portada, instalación y FAQ, con pasos exactos.                                         |
| Starlight genérico                       | Sitio “de plantilla”           | Landing propia + tokens Ink & Violet + componentes de docs personalizados.                            |
| Cloudflare Pages y monorepo              | Build mal configurado          | Root `/`, build filtrado, output `packages/website/dist`, `NODE_VERSION`/`PNPM_VERSION` fijados.      |
| Dominio mal escrito o DNS incompleto     | Sitio inaccesible              | Verificar `roleplay-manager.com` en Cloudflare; no tocar MX; usar el flujo de custom domain de Pages. |
| Sin prueba social                        | Portada fría                   | Capturas reales, datos verificables, carpeta `data/`, licencia y transparencia.                       |

---

## 11. Conclusión

GameNative demuestra que **una acción clara vende**. SillyTavern demuestra que
**una documentación por tareas sostiene el producto**. Roleplay Manager necesita
las dos, en ese orden:

1. En 30 segundos: qué es, para quién es, cuánto pesa, si necesita Node.js y
   dónde están los datos.
2. En 5 minutos: descargar, descomprimir, abrir, conectar la IA y crear el primer
   personaje.
3. Cuando haga falta: una referencia buscable, bilingüe y escrita para personas.

La identidad «Ink & Violet» ya tiene suficiente carácter para que el sitio no se
parezca a ninguna de las dos referencias. El trabajo es aplicarla con disciplina:
papel, tinta, filos, una mascota anfitriona y un solo destello.

---

## Referencias

- GameNative — <https://gamenative.app/> (consultado 2026-10-23).
- SillyTavern Docs — <https://docs.sillytavern.app/> (consultado 2026-10-23).
- Cloudflare Pages, build configuration — <https://developers.cloudflare.com/pages/configuration/build-configuration/>.
- Cloudflare Pages, custom domains — <https://developers.cloudflare.com/pages/configuration/custom-domains/>.
- Cloudflare Pages, headers — <https://developers.cloudflare.com/pages/configuration/headers/>.
- Cloudflare Pages, deploy hooks — <https://developers.cloudflare.com/pages/configuration/deploy-hooks/>.
- Starlight, configuration reference — <https://starlight.astro.build/reference/configuration/>.
- `npm view @astrojs/starlight version peerDependencies` → `0.42.6`, `astro ^7.2.10` (2026-10-23).
- GitHub API, última release de Roleplay Manager → `v1.47.0`, 5 assets (2026-10-23).
- DNS `roleplay-manager.com` → NS `alla.ns.cloudflare.com`, `will.ns.cloudflare.com`; sin registro A (2026-10-23).
