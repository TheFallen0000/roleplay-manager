# Rediseño «Ink & Violet» — Plan (S59–S62)

**Estado:** dirección aprobada (2026-10-09); prototipos de Fase 0
corregidos y listos para **S59**.
**Fecha:** 2026-10-09
**Ámbito:** `packages/frontend` (todas las pantallas), `packages/ui`
(primitivas), `packages/shared` (tipos, i18n) y `packages/backend`
(apariencia por conversación).

---

## 1. Objetivo

El producto funciona y está publicado, pero su interfaz habla el idioma
visual neutro de shadcn: no comunica que esto es un espacio para gente que
hace rol con personajes anime. El rediseño convierte la app en una
plataforma **con alma fandom y pulso anime**, sin perder lo que la hace
útil: sesiones de escritura largas, densidad legible, memoria y
continuidad.

El rediseño sustituye el mundo visual (no lo pule): los tokens, la
tipografía, la forma, el color y el movimiento se rehacen alrededor de la
mascota y de la escena real de uso (escribir de noche, durante semanas).

## 2. Decisiones fijadas con el usuario (2026-10-09)

| Tema | Decisión |
|---|---|
| Dirección visual | **Ink & Violet** («Tinta y Violeta»): base limpia y redondeada con la tinta y el violeta de los ojos de la mascota, más toques de novela visual. |
| Proceso | **Prototipos HTML primero**: welcome, biblioteca, chat y style tile, para aprobar la dirección antes de tocar la app. |
| Mascota | El usuario genera más poses con IA; la app integra el arte como sistema (no como adorno suelto). |
| Modos | Claro y oscuro igual de cuidados; `system` sigue siendo el modo por defecto. |
| Sabores priorizados | Estilos de mensaje (burbuja/documento/novela visual), color de diálogo por personaje, mundos ampliados, mascota en estados vacíos/errores, micro-animaciones y tipografías con sabor japonés. |
| Persistencia | El **estilo de mensaje** y los **colores de diálogo** se guardan **por conversación** (backend), no global por navegador. |

## 3. Investigación aplicada

### 3.1 Plataformas de referencia

- **Character.AI** — limpia y minimalista; referencia de jerarquía, no de
  personalidad.
- **Janitor AI / Chub.ai** — el patrón fandom de tarjetas + temas
  personalizables por personaje, con backgrounds y colores propios
  (recopilaciones en <https://chatbotthemes.carrd.co/>).
- **SillyTavern** — su comunidad premia lo «moderno, elegante y
  minimalista». El tema [Moonlit Echoes](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme)
  (432★, **AGPL igual que este repo**) aporta la referencia directa:
  estilos de mensaje *Flat / Bubble / Document / Echo / Whisper / Hush /
  Ripple / Tide*, **modo novela visual**, presets de color y colorizador
  de diálogos. Compatible para inspirarse o portar ideas con atribución.
- **RisuAI / Agnai / DreamGen / Talkie / Emochi / SpicyChat** — paisaje
  general: oscuro de noche, coloridos de día; personalidad sin miedo.
- **Blue Archive** — ventanas grandes, redondeadas y limpias con arte
  anime: modelo de la **base** de la app
  ([kit de diálogo en Figma](https://www.figma.com/community/file/1395637001129201308/blue-archive-dialouge-gui-remade)).

### 3.2 Lenguajes visuales

- **Persona 5 Royal** — la referencia de UI anime audaz (rojo/negro/
  blanco, diagonales, halftone, feedback con *jitter*). Con
  [design system en GitHub](https://github.com/IAnero/Persona5-DesignSystem)
  y una [skill de agente](https://github.com/cooperchx-waihei/persona-5-skills)
  (MIT) que documenta los detalles. Se usa solo para **momentos
  expresivos** (no para toda la app).
- **Novela visual** — caja de diálogo con name plate, color por
  personaje y fondos con overlay: el chat ya soporta fondo + `scrim`;
  faltan name plates y color de diálogo.
- **Bases de UI de juegos** para más referencias:
  [gameuidatabase.com](https://www.gameuidatabase.com/) e
  [interfaceingame.com](https://interfaceingame.com/).

### 3.3 Skills de diseño instaladas (2026-10-09)

Ya estaban `impeccable` (pbakaus) y `shadcn`. Se añadieron, vía
`npx skills add … --agent opencode`:

| Skill | Origen | Para qué |
|---|---|---|
| `frontend-design` | anthropics/skills | Dirección estética y anti-defaults |
| `webapp-testing` | anthropics/skills | Playwright: capturas y verificación del UI |
| `design-taste-frontend` | leonxlnx/taste-skill | Gusto anti-template |
| `redesign-existing-projects` | leonxlnx/taste-skill | Audit-first en rediseños |
| `emil-design-eng` | emilkowalski/skill | Pulido fino e interacción |
| `animate` | emilkowalski/skill | Decisiones de motion al implementar |
| `review-animations` | emilkowalski/skill | Auditoría de animaciones |
| `mobile-native` | emilkowalski/skill | La app se usa desde el teléfono (PWA) |
| `web-design-guidelines` | vercel-labs/agent-skills | Auditoría de accesibilidad |

Registradas en `skills-lock.json` y `.agents/skills/`. Referencia extra
sin instalar: `persona-5-skills` (documento de lenguaje visual, MIT).

### 3.4 Herramientas

- **[tweakcn](https://tweakcn.com)** — editor visual de temas shadcn
  (Tailwind v4); genera exactamente el formato de tokens de
  `packages/ui/src/styles/globals.css`. Útil para iterar paletas.
- **[React Bits](https://reactbits.dev)** (48.8k★) — 200+ componentes
  animados instalables con `npx shadcn add @react-bits/…` para momentos
  puntuales (nunca para todo).
- **Fontsource** — self-hosted, como Geist hoy: `@fontsource/zen-maru-gothic`
  (300–900, sin italic), `@fontsource/dela-gothic-one` (display),
  `@fontsource/zen-kaku-gothic-new` (cuerpo, en prueba). Verificados en
  `5.3.0`; `@fontsource/m-plus-rounded-1c` queda como alternativa.

## 4. El mundo «Ink & Violet»

### 4.1 Concepto

**Tinta sobre papel + el violeta de la mascota + ecos de novela visual.**
Un taller de escritura de noche: papel frío (no crema), tinta negra con
veta violeta, un violeta vivo para la acción y el habla, un dorado suave
de *sparkle* reservado para hitos, y sakura como acento emocional
secundario. La mascota es la anfitriona: aparece en bienvenida, estados
vacíos, carga y errores, nunca como decoración repetida.

### 4.2 Paleta propuesta (oklch, a validar en prototipos)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `oklch(0.98 0.006 300)` | `oklch(0.16 0.025 300)` | Papel frío / tinta noche |
| `--foreground` | `oklch(0.20 0.02 300)` | `oklch(0.97 0.008 300)` | Tinta |
| `--primary` | `oklch(0.54 0.24 300)` | `oklch(0.75 0.15 300)` | Violeta acción |
| `--primary-soft` | `oklch(0.93 0.045 300)` | `oklch(0.30 0.06 300)` | Fondos de selección |
| `--accent-sakura` | `oklch(0.72 0.13 355)` | `oklch(0.78 0.11 355)` | Acento emocional |
| `--accent-spark` | `oklch(0.80 0.13 85)` | `oklch(0.84 0.12 85)` | Sparkle / hitos |
| `--positive` | `oklch(0.58 0.13 155)` | `oklch(0.72 0.12 155)` | Éxito |

Se evita deliberadamente el cream + terracota (default reconocible de la
IA). El violeta manda como color comprometido, no como pizca decorativa.

### 4.3 Tipografía (propuesta)

- **Display / wordmark:** `Dela Gothic One` — para el nombre, la
  bienvenida y números grandes; uso escaso.
- **Títulos:** `Zen Maru Gothic` (500/700/900) — redondeada con
  personalidad japonesa.
- **Cuerpo:** `Zen Kaku Gothic New` (400/500/700), **en prueba** en el
  prototipo frente a `Geist Variable` (que se conserva como reserva). La
  decisión final la manda una sesión de escritura larga.
- Subsets `latin` / `latin-ext` (la UI es ES/EN); sin italic en Zen Maru ni
  Dela.

### 4.4 Materiales, forma y motion

- **Papel:** grano SVG al 2–3 % en modo claro; en oscuro, papel nocturno
  con glow violeta muy suave. Nunca texturas bajo bloques de texto largos.
- **Forma:** radio base ~`0.75rem`; tarjetas guiadas por imagen con marco
  interior «tinta»; anillos violeta al hover; badges tipo placa.
- **Motion:** tokens `120/180/280 ms` con `cubic-bezier(0.22,1,0.36,1)`;
  entrada de mensaje 180 ms (fade + 4 px); cursor de streaming como
  pincelada; transiciones de vista suaves; todo con
  `prefers-reduced-motion`.
- **Momentos sparkle (uno por superficie):** bienvenida, personaje
  creado, actualización aplicada. Nada de estrellitas por todas partes.

## 5. Mundos (paletas del selector)

Los ids existentes se conservan (`default`, `forest`, `ocean`) para no
romper el `localStorage`; se retocan a la nueva calidad y se añaden dos:

| id | Nombre ES / EN | Carácter |
|---|---|---|
| `default` | Tinta y Violeta / Ink & Violet | La marca |
| `sakura` | Sakura / Sakura | Rosa suave, diurno |
| `forest` | Bosque / Forest | Verde tintado (retenido) |
| `ocean` | Océano / Ocean | Azul tintado (retenido) |
| `midnight` | Medianoche / Midnight | Índigo profundo nocturno |

Cada mundo define claro + oscuro completos (todos los tokens semánticos).

## 6. Apariencia por conversación (decisión de datos)

El estilo de mensaje y los colores de diálogo viven **en la conversación**
(decidido 2026-10-09), siguen el patrón de `backgroundFit`/`scrim` de
S30 y viajan en el export/import.

### 6.1 Modelo

- `conversations.message_style`: enum `bubble | document | novel`,
  `not null default 'bubble'`.
- `conversations.character_dialogue_color`: texto hex `#RRGGBB` o `null`
  (null = color del tema).
- `conversations.user_dialogue_color`: igual, para el papel del usuario.

### 6.2 Puntos de toque confirmados

**Shared** — `packages/shared/src/types/conversation.ts`
(`ConversationDetail`, `ConversationSettingsUpdate`, tipo
`MessageStyle`), `packages/shared/src/types/export.ts`
(`ExportConversation` y `ExportSettings` con campos opcionales) e i18n
`locales/es.ts` + `locales/en.ts`.

**Backend** —
`infrastructure/.../drizzle/schema/conversations.schema.ts` + migración
Drizzle nueva (0014);
`domain/entities/conversation.entity.ts`;
`application/use-cases/conversation/{create-conversation,get-conversation,update-conversation-settings,branch-conversation}.use-case.ts`;
`application/use-cases/character/{export-character,import-character,apply-settings-template}.use-case.ts`;
repositorio Drizzle de conversaciones (reconstrucción);
tests de los casos anteriores. Las **ramas heredan** los tres campos
(regla S16) y el import aplica defaults si faltan (compatibilidad con
exports antiguos, `schemaVersion: 1` sin cambios).

**Frontend** — `lib/api/conversations.ts` (ya genérico),
`components/conversation/customization-tab.tsx` (bloque «Apariencia del
chat»), componentes nuevos `message-style-picker.tsx` y
`dialogue-color-picker.tsx` (uno por responsabilidad, <500 líneas),
`message.tsx` + contenedor del chat (variables CSS
`--r-dialogue-char` / `--r-dialogue-user` y `data-message-style`),
`settings-panel.tsx` si toca copy.

### 6.3 Los tres estilos

- **Burbuja** — el actual, pulido.
- **Documento** — ancho completo, sin burbuja, prosa continua con
  avatares pequeños: lectura inmersiva.
- **Novela visual** — name plate por personaje, diálogo con su color,
  fondo del chat protagonista (el `scrim` existente ayuda), acciones en
  cursiva atenuada. `parseMessage` ya separa diálogo/acción/OOC, así que
  el colorizador no necesita parsear nada nuevo.

**Tratamiento de los segmentos (aprobado en prototipos, 2026-10-09):** el
diálogo del personaje lleva su color; el del usuario, el suyo (en burbuja,
sobre violeta, la conversación es papel + color de contraste, y el color
personalizado aplica en documento/novela). La **narración**
(`*…*`) hereda el color del texto con `opacity: .9`, así se lee sobre
papel, tarjeta o burbuja sin reglas por estilo. El **OOC** (`//…//`) es
una **pastilla mono auto-suficiente** (fondo de tinta, texto del papel y
al revés en oscuro) que contrasta sobre cualquier superficie; no depende
de un hue fijo.

## 7. Mascota (arte en producción por el usuario)

### 7.1 Poses a generar — **diferido**

> **Decisión (2026-10-09):** la producción del arte adicional se pospone
> sin bloquear nada. Hasta que llegue, la app usa el arte existente
> (`mascot-192.png` / `face-96.png`) y `MascotPose` cae a la pose neutral
> cuando falta una variante. Esta es la lista de lo que hay que generar
> cuando se retome:

`hello` (saludo/neutral) · `happy` (celebrando) · `thinking` (pensando) ·
`sleepy` (dormida) · `sorry` (disculpa) · `surprised` (sorpresa) ·
`sparkle` (emoción máxima).

- PNG fondo transparente, ≥1024×1024, misma paleta y estilo que el arte
  original (`docs/brand/logo-source.png`), sin texto ni marcas de agua.
- Originales en `docs/brand/poses/`; los derivados servidos se generan con
  `scripts/generate-brand-assets.mjs` (extender `pnpm brand:generate`) a
  `packages/frontend/public/brand/poses/` (p. ej. 256/512 px WebP/PNG).
- Fallback: si falta una pose, el componente cae a la neutral (la app
  funciona antes de que llegue todo el arte).

### 7.2 Componente y mapa de uso

`MascotPose` junto a `BrandFace`/`BrandMascot` en
`components/layout/brand.tsx` (o `mascot-pose.tsx` si crece), con `pose`
y tamaño. Usos: bienvenida (`happy`/`hello`), lista vacía de personajes
(`hello`), chat recién creado (`sparkle`), streaming/pensando
(`thinking`), errores (`sorry`), memoria vacía (`sleepy`),
actualización disponible (`surprised`).

## 8. Fase 0 — Prototipos y aprobación

Carpeta `docs/prototypes/` (HTML/CSS estático, sin build, abrir en el
navegador; claro/oscuro conmutables; datos ficticios rotulados como
sintéticos). Cuatro piezas:

1. `style-tile.html` — paleta, tipografía, radios, sombras, motion y
   momento sparkle.
2. `welcome.html` — onboarding con mascota, selector de mundo, idioma y
   modo.
3. `library.html` — shell (sidebar + header) y grilla de personajes, con
   estado vacío.
4. `chat.html` — la misma conversación en los **tres estilos**, colores
   de diálogo, input, streaming y alternativas.

**Criterio de aprobación:** el usuario revisa, comenta y elige; los
ajustes se incorporan a los prototipos. Aprobados → arranca S59 y
`DESIGN.md` se escribirá **al final** del rediseño, desde el mundo
construido (regla de `impeccable`), no antes.

**Estado:** creados en `docs/prototypes/` (`welcome.html`,
`style-tile.html`, `library.html`, `chat.html`, `prototype.css`,
`prototype.js` y un `README.md` con la guía de revisión). El detector
mecánico de `impeccable` pasa limpio sobre ellos.

## 9. Slices

| Slice | Versión | Contenido | Criterios clave |
|---|---|---|---|
| **S59 — Fundación Ink & Violet** | `1.37.0` | Tokens nuevos en `globals.css`, fuentes, 5 mundos, selector de temas retocado, **welcome/onboarding** rediseñado. | Claro/oscuro completos; sin flashes; `localStorage` intacto; `pnpm check` verde; a11y de contraste. |
| **S60 — Shell y biblioteca** | `1.38.0` | Sidebar, header/menubar, grilla de personajes, tarjetas, toolbar, estados vacíos y `MascotPose` (con las poses disponibles). | Nada >500 líneas; aislamiento de features; responsive + phone. |
| **S61 — Chat con carácter** | `1.39.0` | Apariencia por conversación (backend completo + UI) y los tres estilos con colores de diálogo. | Migración + ramas + export/import/tests; render sin saltos; swipe intacto. |
| **S62 — Delicia y cierre** | `1.40.0` | Micro-animaciones, streaming, mascota en estados, pase `mobile-native`, auditoría a11y, `polish`/`critique`, **`DESIGN.md` + documenter**, capturas y detector. | `detect` limpio o justificado; reducción de motion; `DESIGN.md` con tokens; release + changelog. |

Cada slice: bump en `package.json`, entrada en `CHANGELOG.md` y
`docs/10-slices/SXX-progress.md`, con commits convencionales pequeños
(shared → backend → ui → frontend → tests → docs → release) según
`AGENTS.md`.

## 10. Restricciones y riesgos

- **500 líneas** por archivo en `src/**` — la grilla y el chat ya están
  cerca; los estilos nuevos se extraen a componentes/hokes desde el
  principio.
- **Aislamiento de features** (`pnpm check:arch`): los pickers nuevos
  viven en la feature `conversation/`.
- **i18n**: todo copy nuevo en `es.ts` y `en.ts`.
- **Temas existentes**: ids sin cambios; solo se añaden ids y se
  retocan etiquetas/valores (nada de migraciones de `localStorage`).
- **PWA**: `theme-color` y colores del manifest se revalidan con el
  violeta nuevo.
- **Contraste a11y**: el violeta primario debe pasar AA en ambos modos
  (se valida con el detector y `web-design-guidelines`).
- **Rendimiento**: animaciones acotadas (transform/opacity), nada de
  filtros pesados por mensaje; streaming sin re-render extra.
- **Licencias**: inspiración y patrones sí; assets/fuentes propietarias
  de juegos, no. Moonlit Echoes es AGPL (compatible) con atribución si
  se porta código.
- **Alcance visual vs. función**: el modo Operate manda; los momentos
  expresivos nunca tapan la tarea (leer, escribir, comparar).

## 11. Criterios de aceptación globales

- [ ] La app se siente de la misma familia que sus referentes fandom sin
      romper la lectura larga (densidad, contraste, foco visible).
- [ ] Welcome, biblioteca y chat son coherentes entre sí en claro y
      oscuro, y con los 5 mundos.
- [ ] Estilo de mensaje y colores de diálogo persisten por conversación,
      heredan en ramas y viajan en export/import.
- [ ] La mascota aparece con intención (bienvenida, vacíos, errores,
      carga) y tiene fallback seguro.
- [ ] `pnpm check` verde en cada slice; sin archivos huérfanos ni >500
      líneas.
- [ ] `DESIGN.md` documenta el mundo construido con tokens y
      `.impeccable/design.json`; capturas de desktop y mobile adjuntas.

## 12. Estado y próximos pasos

1. ~~Skills de diseño instaladas~~ (2026-10-09).
2. ~~Prototipos de Fase 0~~ — en `docs/prototypes/`; **dirección aprobada**
   por el usuario (2026-10-09) con las correcciones de contraste de
   segmentos aplicadas. Detector sin hallazgos (modo archivo); en navegador
   solo queda el cursor de streaming, excepción documentada en el propio
   archivo.
3. Arte adicional de la mascota — **diferido** (§7.1); se usa el arte
   existente con fallback a la pose neutral.
4. ~~S59 — Fundación~~, ~~S60 — Shell y biblioteca~~ y ~~S61 — Chat con
   carácter~~ — entregados (v1.37.0, v1.37.1, v1.38.0 y v1.39.0; ver
   `S59-progress.md`, `S60-progress.md` y `S61-progress.md`). Siguiente:
   **S62 — Delicia y cierre** (micro-animaciones, mascota en estados, a11y,
   `DESIGN.md` y capturas de cierre).
