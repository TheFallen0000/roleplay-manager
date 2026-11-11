# 15 — Plan UX/UI card-first (S133–S134)

**Estado:** Draft para revisión
**Fecha:** 2026-11-11
**Ámbito:** `packages/frontend`, `packages/backend`, `packages/shared` y
`packages/ui` si aparece una primitiva nueva.
**Referencias:** `docs/14-card-first-audit.md`,
`docs/10-slices/S132-progress.md`, `docs/redesign-plan.md`,
`docs/prototypes/`, `PRODUCT.md`, `DESIGN.md`.

---

## 1. Decisiones tomadas

| Tema                              | Decisión                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relación personaje–lorebook       | **Biblioteca independiente + vínculo 1:1 opcional.** Un lorebook puede existir sin personaje; cada personaje puede tener como máximo uno vinculado. |
| Destino de los flujos de creación | **Páginas dedicadas.** El diálogo «Crear» solo elige; `/characters/new` y `/lorebooks/new` contienen los formularios.                               |
| Editor de personaje               | **Página con secciones y nav sticky.** Sin tabs; anclas y barra de guardado.                                                                        |
| Secuencia                         | **Personaje → Lorebooks → memoria/retrieval.** S133 personaje + shell; S134 biblioteca de lorebooks; S135 vuelve a memoria.                         |
| Crear personaje                   | **Esenciales + card + fichas** en la misma página, con avanzados plegados.                                                                          |
| Lorebook dentro del personaje     | **Resumen + enlace.** La edición vive en la sección Lorebooks.                                                                                      |
| Dirección visual                  | **Ink & Violet existente.** No se crea un mundo nuevo; se extiende el sistema actual.                                                               |

---

## 2. Design read

**Reading this as: app de escritura y gestión (Operate) para una persona que
ya tiene personajes y quiere continuar historias largas, dentro del mundo Ink &
Violet, con una interfaz calmada de papel y tinta que prioriza claridad sobre
densidad.**

Consecuencias:

- No es una landing: nada de hero, secciones de marketing ni métricas
  decorativas.
- La jerarquía se gana con espacio, tipografía y agrupación, no con más cajas.
- El diálogo «Crear» es una bifurcación clara, no un formulario.
- Las páginas de creación/edición son espacios de trabajo: nav estable,
  secciones predecibles y guardado visible.
- La biblioteca de lorebooks se siente como una estantería, no como una tabla
  de administración.

Diales para esta superficie: `DESIGN_VARIANCE: 4`, `MOTION: 4`,
`VISUAL_DENSITY: 5`. Son pantallas de uso diario, no una pieza experimental.

---

## 3. Design brief

### 3.1 Job and audience

Persona que escribe rol con IA en su equipo, en sesiones largas. Llega a la
biblioteca con personajes existentes o con una card de SillyTavern que quiere
importar. Su estado mental es «quiero empezar a escribir», no «quiero
configurar un panel». Necesita entender en segundos qué es un personaje, qué es
un lorebook y dónde se edita cada cosa.

### 3.2 Outcome and proof

El éxito es que pueda:

1. Crear un personaje con su card y sus fichas sin perderse.
2. Crear o importar un lorebook y vincularlo a un personaje.
3. Entender de un vistazo qué lorebook tiene cada personaje.
4. Editar sin tabs ni modales que acumulan todo.

La prueba está en los flujos reales: crear un personaje desde cero, importar
una card V2/V3, crear un lorebook con tres entradas y vincularlo, y volver al
personaje para ver el resumen.

### 3.3 Selected direction

**Card-first, superficie de trabajo seccionada.** El personaje deja de ser un
formulario con tabs y pasa a ser una página con identidad, card, fichas,
lorebook y versiones. El lorebook deja de ser una pestaña escondida y pasa a
ser una biblioteca propia. El diálogo «Crear» solo decide el tipo de objeto.

La metáfora es «biblioteca de autor»: personajes y lorebooks son volúmenes
distintos; el personaje puede tener un libro de lore vinculado, pero no lo
absorbe. La card es la ficha del personaje; las fichas de conocimiento son
notas internas de RM.

### 3.4 Scope and boundaries

**Dentro:**

- Shell de navegación: grupo «Biblioteca» con Personajes, Lorebooks y
  Personajes jugados.
- Diálogo «Crear» con dos placas grandes: Personaje y Lorebook.
- Página de crear personaje: identidad, card, fichas.
- Página de detalle/edición de personaje: secciones + nav sticky + save bar.
- Página de lorebooks: listado, crear, detalle/edición, vincular.
- Resumen de lorebook dentro del personaje + enlace a su página.
- Import/export de cards y lorebooks en sus superficies.
- Card contract (`GET/PUT card`) y `extensions.rm` para no perder datos de RM.
- Selector de saludo alternativo al iniciar una conversación (si el alcance lo
  permite; ver decisiones abiertas).

**Fuera:**

- Group chats, assets V3, CHARX, prompt manager de ST.
- Lorebook avanzado (timed effects, probabilidad, grupos, decoradores).
- Un editor visual de árbol de ramas.
- Un rediseño del chat o de las pantallas de sistema.
- Un nuevo mundo visual: se hereda Ink & Violet.

### 3.5 States and ranges

- **Vacío:** sin personajes; sin lorebooks; personaje sin fichas; lorebook sin
  entradas; personaje sin lorebook vinculado.
- **Carga:** skeletons de listado y de formulario; spinner en guardar.
- **Error:** validación inline por campo; banner para errores de API; warnings
  de importación (V1, regex ignorado, efectos temporizados preservados).
- **Sucio:** barra de guardado visible; aviso al salir si hay cambios.
- **Conflicto:** personaje que ya tiene lorebook al vincular otro; libro que ya
  está vinculado a otro personaje.
- **Volumen:** 0–100 personajes, 0–100 lorebooks, 0–1.000 entradas por libro.
  El listado debe paginar o cargar por lotes; el editor de entradas debe
  virtualizar o plegar si hay muchas.

### 3.6 Interaction and layout

- El diálogo «Crear» es un modal pequeño con dos placas; en móvil se apilan.
- Las páginas de creación/edición usan una columna principal y una nav de
  secciones sticky; en móvil la nav se convierte en chips horizontales.
- La barra de guardado es sticky al pie en móvil y visible en el header en
  escritorio.
- Las secciones avanzadas se pliegan con `<details>`/accordion, pero los
  campos esenciales nunca se esconden.
- Los listados usan cards de papel con una acción primaria clara; los menús
  contextuales quedan para acciones secundarias.
- El movimiento es sobrio: 120–180 ms, fade + 4 px, `prefers-reduced-motion`.

### 3.7 Constraints

- Astro + React + shadcn/ui; tokens y fuentes existentes.
- Sin nuevas dependencias si una primitiva de `@workspace/ui` ya cubre el caso.
- i18n ES/EN en `packages/shared/src/i18n`; nada hardcodeado.
- `lib/api/` puro, sin React; componentes <500 líneas; aislamiento de features.
- Accesibilidad: labels, foco, teclado, contraste, `aria-current` en nav.
- La app se usa en escritorio y en móvil por PWA; ambos son ciudadanos de
  primera.

---

## 4. Information architecture

### 4.1 Sidebar

| Grupo          | Items                                     |
| -------------- | ----------------------------------------- |
| **Biblioteca** | Personajes, Lorebooks, Personajes jugados |
| **Sistema**    | Proveedores, Actualizaciones, Registro    |
| **Ayuda**      | Tutoriales                                |

Cambios:

- El grupo «Personajes» pasa a llamarse «Biblioteca» / «Library».
- Se añade «Lorebooks» con icono de libro.
- «Personajes jugados» se mantiene dentro de Biblioteca.
- `isActive` debe distinguir `/` de `/lorebooks` y `/player-characters`.

### 4.2 Routes

| Ruta                 | Pantalla                     | Slice                                          |
| -------------------- | ---------------------------- | ---------------------------------------------- |
| `/`                  | Biblioteca de personajes     | S133                                           |
| `/characters/new`    | Crear personaje              | S133                                           |
| `/characters/:id`    | Detalle/edición de personaje | S133                                           |
| `/lorebooks`         | Biblioteca de lorebooks      | S133 (directorio) / S134 (biblioteca completa) |
| `/lorebooks/new`     | Crear lorebook               | S134                                           |
| `/lorebooks/:id`     | Detalle/edición de lorebook  | S133 (libros vinculados) / S134 (todos)        |
| `/player-characters` | Personajes jugados           | Sin cambios                                    |
| `/settings/*`        | Sistema                      | Sin cambios                                    |
| `/tutorials`         | Tutoriales                   | Sin cambios                                    |

### 4.3 Create dialog

Un modal pequeño, sin formulario:

```
┌─────────────────────────────────────────────┐
│ Crear                                       │
│ ¿Qué quieres crear?                         │
│                                             │
│ ┌─────────────────┐  ┌─────────────────┐   │
│ │   [personaje]   │  │    [libro]      │   │
│ │   Personaje     │  │   Lorebook      │   │
│ │ Identidad, card │  │ Conocimiento y  │   │
│ │ y fichas        │  │ entradas        │   │
│ │             →   │  │             →   │   │
│ └─────────────────┘  └─────────────────┘   │
│                                             │
│ ¿Ya tienes un archivo? Importar card        │
└─────────────────────────────────────────────┘
```

- Dos placas grandes, mismo peso visual.
- La placa de personaje lleva a `/characters/new`.
- La placa de lorebook lleva a `/lorebooks` o `/lorebooks/new` según el slice.
- «Importar card» es un enlace terciario, no una tercera placa.
- El modal no contiene tabs ni campos.

### 4.4 Character page sections

| Sección       | Contenido                                                                                                                                                                          | Estado                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Identidad** | Nombre, subtítulo, imagen, descripción                                                                                                                                             | Siempre visible                         |
| **Card**      | Personalidad, escenario, primer mensaje, saludos alternativos, ejemplos, system prompt, post-history, notas del creador, tags, creador, versión de card, género/pronombres/tagline | Esenciales visibles; avanzados plegados |
| **Fichas**    | Tarjetas de conocimiento de RM (título, contenido, activa, orden)                                                                                                                  | Visible                                 |
| **Lorebook**  | Resumen del libro vinculado + abrir/vincular/crear                                                                                                                                 | Visible                                 |
| **Versiones** | Historial de versiones y selector                                                                                                                                                  | Visible en edición                      |

La nav sticky muestra las cinco secciones con un indicador de sección activa.
En creación, «Versiones» no aparece.

### 4.5 Lorebook page sections

| Sección       | Contenido                                                 |
| ------------- | --------------------------------------------------------- |
| **Identidad** | Nombre, descripción                                       |
| **Ajustes**   | Scan depth, token budget, recursive scanning, con ayudas  |
| **Entradas**  | Lista de entradas, añadir/editar/reordenar, import/export |
| **Vínculo**   | Personaje vinculado (selector), desvincular, aviso 1:1    |
| **Peligro**   | Eliminar lorebook                                         |

En S133, el libro siempre está vinculado a un personaje; en S134, el vínculo
es opcional y el libro puede existir sin personaje.

---

## 5. Flows

### 5.1 Crear personaje

1. Biblioteca de personajes → «Crear» → modal.
2. Elige «Personaje» → `/characters/new`.
3. La página abre en **Identidad** con nombre, subtítulo, imagen y descripción.
4. Puede completar **Card** (con avanzados plegados) y **Fichas**.
5. La barra de guardado muestra «Crear personaje» cuando los campos
   obligatorios están completos.
6. Al crear, va al detalle del personaje con un toast y la sección Identidad.

**Regla:** el botón de crear no exige completar los campos avanzados; solo
nombre, descripción y saludo (los invariantes actuales). La card se puede
completar después.

### 5.2 Editar personaje

1. Biblioteca → personaje.
2. La página muestra el header con imagen, nombre, subtítulo, tags, creador,
   versión de card y acciones (conversar, exportar, eliminar).
3. La nav sticky permite saltar a Identidad, Card, Fichas, Lorebook, Versiones.
4. Cualquier cambio marca la página como sucia y muestra la barra de guardado.
5. Guardar crea una versión nueva (comportamiento actual) y muestra un aviso
   claro: «Guardar crea una versión nueva».
6. El selector de versión del header permite consultar una versión anterior;
   si se edita una versión antigua, se crea una nueva a partir de ella.

### 5.3 Iniciar conversación y saludo alternativo

1. Desde el personaje o la biblioteca, «Conversar».
2. Si el personaje tiene `alternateGreetings`, se abre un selector con
   `first_mes` + alternativas, con una preview del texto.
3. El mensaje 0 de la conversación es el saludo elegido.
4. Si no hay alternativas, se usa `first_mes` sin fricción.
5. El backend valida que el saludo pertenece a la versión.

Este flujo es candidato a S133; si el slice se hincha, se mueve a S134 sin
cambiar el diseño.

### 5.4 Crear lorebook

1. «Crear» → «Lorebook» → `/lorebooks/new`.
2. Identidad: nombre (obligatorio) y descripción.
3. Ajustes: scan depth, token budget, recursive scanning con valores por
   defecto y ayudas.
4. Entradas: añadir la primera entrada; editor inline con claves, secundarias,
   contenido, posición, orden, prioridad, lógica selectiva y flags.
5. Vínculo: selector opcional de personaje; si el personaje ya tiene un libro,
   se avisa y se ofrece reemplazar o cancelar.
6. Crear → detalle del lorebook con toast.

En S133 (interino), el paso 5 es obligatorio porque el modelo sigue siendo
1:1; en S134 pasa a ser opcional.

### 5.5 Vincular lorebook a personaje

1. Desde el detalle del lorebook o desde la sección Lorebook del personaje.
2. Se elige un personaje (o se desvincula).
3. Si el personaje ya tiene un libro, se muestra un diálogo de confirmación
   para reemplazar el vínculo.
4. El resumen del personaje se actualiza sin recargar la página.

### 5.6 Import/export

- **Card:** import/export en la biblioteca de personajes y en el detalle;
  formato JSON/PNG y spec V2/V3 como hoy.
- **Lorebook:** import/export en la biblioteca de lorebooks y en el detalle;
  CCv3 y ST nativo.
- El diálogo «Crear» solo enlaza a «Importar card»; el resto de importaciones
  viven en sus listados.

### 5.7 Estados vacíos

- Sin personajes: mascota + «Crea tu primer personaje» + dos acciones
  (personaje, importar card).
- Sin lorebooks: mascota con libro + «Crea tu primer lorebook» + importar.
- Personaje sin fichas: texto breve + «Añadir ficha».
- Personaje sin lorebook: «Este personaje no tiene un lorebook vinculado» +
  «Crear lorebook» / «Vincular existente».
- Lorebook sin entradas: «Añade la primera entrada» + explicación de qué es una
  clave.

---

## 6. Screen plans

### 6.1 Biblioteca de personajes

- Header: título, lede, acciones «Importar», «Card de SillyTavern», «Crear».
- «Crear» abre el diálogo de dos placas.
- Grid masonry actual; las cards pueden mostrar tags y un chip de lorebook
  vinculado (opcional, si no ensucia).
- El menú contextual se mantiene: conversaciones, editar, exportar, eliminar.
- Empty state: mascota + «Crear personaje» + «Importar card».

### 6.2 Crear/editar personaje

Wireframe de escritorio:

```
┌──────────────────────────────────────────────────────────────┐
│ [avatar]  Nombre            v3 · tags · creador   [Conversar]│
│           Subtítulo                              [Exportar]  │
├───────────────┬──────────────────────────────────────────────┤
│ Identidad     │  Identidad                                   │
│ Card          │  ┌────────────────────────────────────────┐  │
│ Fichas        │  │ Nombre *                               │  │
│ Lorebook      │  │ Subtítulo                              │  │
│ Versiones     │  │ [imagen]                               │  │
│               │  │ Descripción *                          │  │
│               │  └────────────────────────────────────────┘  │
│               │                                              │
│               │  [Guardar cambios]  (sticky)                 │
└───────────────┴──────────────────────────────────────────────┘
```

- La nav lateral es sticky y muestra la sección activa.
- En móvil, la nav se convierte en una fila de chips scrollable y la barra de
  guardado se pega al pie.
- La sección Card usa fieldsets:
  - **Personaje:** personalidad, escenario.
  - **Apertura:** primer mensaje, saludos alternativos.
  - **Ejemplos:** mensajes de ejemplo.
  - **Prompt:** system prompt, post-history instructions.
  - **Créditos:** notas del creador, tags, creador, versión de card,
    género/pronombres/tagline.
- Los fieldsets avanzados (Créditos, Prompt) se pliegan por defecto en creación
  y se recuerdan abiertos/cerrados en edición.
- La sección Fichas reutiliza el editor actual de tarjetas, renombrado a
  «Fichas» y con el contador.
- La sección Lorebook muestra una card resumen: nombre, entradas, scan depth,
  budget, recursión, personaje vinculado (si aplica) y botón «Abrir lorebook».
  Si no hay libro: CTA «Crear lorebook» / «Vincular existente».

### 6.3 Biblioteca de lorebooks

```
┌──────────────────────────────────────────────────────────────┐
│ Lorebooks                                  [Importar] [Crear]│
│ Libros de conocimiento que tus personajes pueden consultar.  │
│                                                              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│ │ Bosque de Lyra   │ │ Ciudad Sumergida │ │ + Crear       │ │
│ │ 12 entradas      │ │ 4 entradas       │ │   lorebook    │ │
│ │ [avatar] Lyra    │ │ Sin vincular     │ │               │ │
│ └──────────────────┘ └──────────────────┘ └───────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- Card de lorebook: nombre, descripción corta, número de entradas, personaje
  vinculado (avatar + nombre) o chip «Sin vincular», ajustes clave.
- Acciones: abrir, editar, exportar, eliminar, vincular/desvincular.
- Empty state con mascota y CTA.
- Búsqueda y filtro «Todos / Vinculados / Sin vincular» si el listado crece.

### 6.4 Detalle/edición de lorebook

- Header: nombre, personaje vinculado, acciones (exportar, eliminar).
- Nav sticky: Identidad, Ajustes, Entradas, Vínculo.
- Identidad: nombre, descripción.
- Ajustes: scan depth (0–64), token budget (0–100.000), recursive scanning,
  con explicaciones y valores por defecto.
- Entradas: lista de acordeones; cada entrada muestra nombre/comment, claves,
  posición, prioridad y un preview del contenido. El editor inline conserva
  todos los campos actuales.
- Vínculo: selector de personaje, estado actual, desvincular, aviso 1:1.
- La barra de guardado es contextual: guarda ajustes y entradas.

### 6.5 Crear lorebook

Misma estructura que el detalle, pero con un botón «Crear lorebook» y el paso
de vínculo al final. En S133 el vínculo es obligatorio; en S134 es opcional.

---

## 7. Visual and interaction direction

### 7.1 Herencia Ink & Violet

- Tokens existentes: `--background`, `--foreground`, `--primary`,
  `--primary-soft`, `--accent-sakura`, `--accent-spark`, `--positive`.
- Tipografía: Dela Gothic One para el wordmark; Zen Maru Gothic para títulos;
  Zen Kaku Gothic New para cuerpo.
- Superficies: papel frío, cards `rounded-2xl`, bordes hairline, sombras
  tintadas; sin glassmorphism.
- Botones: primario violeta, outline papel, destructive crimson; altura
  existente.
- Mascota: estados vacíos, bienvenida y momentos de éxito; no decoración
  repetida.
- Motion: 120/180/280 ms, `cubic-bezier(0.22,1,0.36,1)`, fade + 4 px;
  `prefers-reduced-motion` respetado.

### 7.2 Diálogo «Crear»

- Modal `max-w-3xl`, dos placas en grid `md:grid-cols-2`.
- Placa: borde hairline, fondo papel, icono/ilustración, título display,
  descripción de una línea, flecha sutil.
- Hover: elevación mínima, anillo violeta suave, flecha se desplaza 2 px.
- Focus: anillo visible, navegación por teclado, `Enter` activa.
- La placa de personaje puede usar una silueta/avatar abstracto; la de
  lorebook, un lomo de libro. Sin assets nuevos obligatorios; si faltan, usar
  iconos de la librería existente.
- El modal se cierra con `Esc` y click fuera; no hay formulario dentro.

### 7.3 Nav de secciones y save bar

- Nav vertical sticky en desktop, dentro de una columna de 200–220 px.
- Indicador activo con barra violeta y fondo `primary-soft`.
- En móvil, chips horizontales con scroll; el chip activo se centra.
- Save bar: en desktop, botón primario en el header + estado «Sin cambios» /
  «Cambios sin guardar»; en móvil, barra fija al pie con safe-area.
- Al guardar, spinner en el botón y toast; los errores se muestran inline y en
  un banner superior si son de API.

### 7.4 Formularios

- Labels arriba, helper text debajo, errores debajo, `gap-2` por bloque.
- Campos de texto largos con contador cuando hay límite.
- Los campos avanzados se pliegan con un encabezado claro y un resumen de lo
  que contienen.
- Los tags y saludos alternativos usan chips con eliminación clara.
- Las notas del creador llevan el aviso «Nunca se envían al modelo».
- La versión de card y los campos display-only se muestran como placas de
  metadatos, no como inputs.

### 7.5 Lorebook entries

- Cada entrada es una fila/acordeón con:
  - Nombre o `comment` como título; si no hay, «Entrada sin título».
  - Chips de claves primarias; las secundarias se muestran al expandir.
  - Badge de posición (Antes/Después) y prioridad.
  - Preview de contenido a 2 líneas.
- Expandida: editor inline con los campos actuales, sin modales.
- Añadir entrada: botón al final + estado vacío.
- Reordenar con handle; el orden se guarda con el resto.
- `use_regex` y campos no activados se muestran como aviso, no como checkbox
  editable.

### 7.6 Responsive

- Desktop: columna de nav + contenido; listados en grid de 2–3 columnas.
- Tablet: nav colapsada a chips; contenido a ancho completo.
- Móvil: una columna; placas del diálogo apiladas; save bar fija; acordeones
  de entrada a ancho completo.
- Probar en 1440, 1024, 768 y 390 px; la app es PWA y se usa desde el teléfono.

### 7.7 Accesibilidad

- `aria-current="page"` en sidebar y nav de secciones.
- Focus visible en placas, chips, acordeones y botones.
- Labels asociados; errores con `aria-describedby`.
- Contraste AA en texto, placeholders, bordes de foco y estados.
- No usar color como único indicador (posición, estado, error).
- Respetar `prefers-reduced-motion`.
- Navegación completa por teclado en el diálogo y los acordeones.

---

## 8. Data and API plan

### 8.1 Card contract (S133)

- `GET /api/characters/:id/card?spec=v2|v3` devuelve el envelope de la versión
  actual (o `versionId` opcional).
- `PUT /api/characters/:id/card` acepta un envelope, valida y crea una versión
  nueva; si incluye `character_book`, sincroniza el lorebook vinculado.
- `extensions.rm` transporta los datos nativos de RM:
  ```ts
  interface RmExtensions {
    version: 1
    subtitle?: string | null
    instructions?: string | null
    knowledgeCards?: Array<{
      title: string
      content: string
      position: number
      active: boolean
    }>
    versionNumber?: number
    tagline?: string | null
  }
  ```
- Al importar una card, `extensions.rm` se lee y se restauran los campos; al
  exportar, se escribe. ST ignora el namespace.
- La card export actual deja de ser solo el subconjunto ST: conserva lo nativo
  de RM dentro de `extensions.rm`.
- No hay migración de base de datos en S133: los campos ya existen.

### 8.2 Lorebook library (S134)

- Migración `0020`: `lorebooks.character_id` pasa a nullable; el índice único
  se mantiene (SQLite permite múltiples `NULL` en un índice único).
- `Lorebook` entity: `characterId: string | null`.
- Repositorio: `list`, `findById`, `create`, `updateSettings`, `link`,
  `unlink`, `delete`; el contexto sigue buscando por `character_id`.
- Regla 1:1: un personaje puede tener como máximo un lorebook; un libro puede
  estar vinculado a un personaje o a ninguno.
- La creación transaccional actual (`CreateCharacterInput.lorebook`) se
  mantiene para import/API, pero la UI de creación de personaje ya no la usa.

### 8.3 API surface

| Método | Ruta                        | Slice                                        |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/characters/:id/card`  | S133                                         |
| PUT    | `/api/characters/:id/card`  | S133                                         |
| GET    | `/api/lorebooks`            | S133 (directorio)                            |
| GET    | `/api/lorebooks/:id`        | S133                                         |
| PUT    | `/api/lorebooks/:id`        | S133 (ajustes/entradas de libros vinculados) |
| POST   | `/api/lorebooks`            | S134 (libro sin personaje)                   |
| POST   | `/api/lorebooks/:id/link`   | S134                                         |
| DELETE | `/api/lorebooks/:id/link`   | S134                                         |
| DELETE | `/api/lorebooks/:id`        | S134                                         |
| POST   | `/api/lorebooks/:id/import` | S134                                         |
| POST   | `/api/lorebooks/:id/export` | S134                                         |

Las rutas actuales por personaje (`/api/characters/:id/lorebook`) se mantienen
por compatibilidad; la UI nueva usa las rutas por libro.

### 8.4 Shared types

- `LorebookSummaryDTO`: id, name, description, entryCount, linkedCharacter
  (id, name, profileImageAssetId) | null, scanDepth, tokenBudget,
  recursiveScanning, updatedAt.
- `CreateLorebookInput`, `UpdateLorebookInput`, `LinkLorebookInput`.
- `CharacterCardEnvelope` / `RmExtensions`.
- `CreateConversationInput.greeting` o `greetingIndex` (si S133 incluye el
  selector).
- i18n: `nav.lorebooks`, `nav.groupLibrary`, `create.*`, `lorebooks.*`,
  `characters.section*`, `characters.fichas*`, `characters.lorebookSummary*`.

### 8.5 Context and activation

- `ConversationContextLoader` sigue resolviendo el libro por `character_id`.
- La activación no cambia: el lorebook vinculado entra por el mismo camino.
- Si el libro se desvincula, las conversaciones existentes dejan de recibir
  sus entradas en el siguiente envío (comportamiento esperado).
- Los ajustes de libro (`scan_depth`, `token_budget`, `recursive_scanning`) se
  editan en la página del lorebook y se reflejan en la siguiente respuesta.

### 8.6 Backward compatibility

- Exports antiguos sin `extensions.rm` importan como hasta ahora.
- Cards V1/V2/V3 sin `extensions.rm` conservan el comportamiento actual.
- Los libros existentes siguen vinculados a su personaje; la migración no
  requiere backfill.
- Las rutas por personaje siguen funcionando; no se rompe la API actual.

---

## 9. Component and file inventory

### 9.1 Frontend — shell and create

- `components/layout/app-shell.tsx`: grupo Biblioteca + Lorebooks.
- `components/character/character-create-dialog.tsx` → reemplazar por
  `components/shared/create-dialog.tsx` o `components/layout/create-dialog.tsx`
  con dos placas.
- `pages/characters/new.astro`: nueva página de creación.
- `pages/characters/[id].astro`: nueva página de detalle.
- `components/character/character-page.tsx`: shell de la página (header, nav,
  secciones).
- `components/character/character-section-nav.tsx`
- `components/character/character-save-bar.tsx`
- `components/character/sections/identity-section.tsx`
- `components/character/sections/card-section.tsx`
- `components/character/sections/fichas-section.tsx`
- `components/character/sections/lorebook-section.tsx`
- `components/character/sections/versions-section.tsx`
- `components/character/use-character-page.ts` (estado de secciones, dirty,
  guardado, versiones).
- Reutilizar: `character-card-fields.tsx`, `alternate-greetings-input.tsx`,
  `tags-input.tsx`, `creator-notes-panel.tsx`, `gender-pronouns-chips.tsx`,
  `profile-image-input.tsx`, `sortable`.

### 9.2 Frontend — lorebooks

- `pages/lorebooks/index.astro`
- `pages/lorebooks/new.astro`
- `pages/lorebooks/[id].astro`
- `components/lorebook/lorebook-list.tsx`
- `components/lorebook/lorebook-card.tsx`
- `components/lorebook/lorebook-page.tsx`
- `components/lorebook/lorebook-section-nav.tsx`
- `components/lorebook/lorebook-identity-section.tsx`
- `components/lorebook/lorebook-settings-section.tsx`
- `components/lorebook/lorebook-entries-section.tsx`
- `components/lorebook/lorebook-link-section.tsx`
- `components/lorebook/lorebook-entry-form.tsx` (mover desde `character/`)
- `components/lorebook/lorebook-editor.tsx` (mover/refactor desde `character/`)
- `components/lorebook/use-lorebook-page.ts`
- `lib/api/lorebooks.ts` (nuevo; mantener `lorebook.ts` por compatibilidad o
  migrar las funciones).
- `components/shared/lorebook/lorebook-summary-card.tsx` si lo usa el personaje
  y la biblioteca.

### 9.3 Backend

- `application/use-cases/character/get-character-card.use-case.ts`
- `application/use-cases/character/update-character-card.use-case.ts`
- `application/use-cases/character/lorebook/list-lorebooks.use-case.ts`
- `application/use-cases/character/lorebook/get-lorebook-by-id.use-case.ts`
- `application/use-cases/character/lorebook/update-lorebook-by-id.use-case.ts`
- `application/use-cases/character/lorebook/create-lorebook.use-case.ts`
- `application/use-cases/character/lorebook/link-lorebook.use-case.ts`
- `application/use-cases/character/lorebook/unlink-lorebook.use-case.ts`
- `application/use-cases/character/lorebook/delete-lorebook.use-case.ts`
- `infrastructure/adapters/primary/routes/lorebook.routes.ts` (rutas por
  libro)
- `infrastructure/adapters/primary/routes/character.routes.ts` (card)
- `domain/ports/lorebook.repository.ts` (list/link/unlink)
- `infrastructure/.../drizzle/repositories/drizzle-lorebook.repository.ts`
- `infrastructure/database/migrations/0020_lorebook_library.sql` (S134)
- `containers/app-container.ts`

### 9.4 Shared and i18n

- `packages/shared/src/types/sillytavern-card.ts` o un nuevo
  `card-contract.ts` para `RmExtensions` y el envelope.
- `packages/shared/src/types/character.ts` para el DTO del card si aplica.
- `packages/shared/src/i18n/locales/es.ts` y `en.ts` con las claves nuevas.
- `packages/shared/src/types/export.ts` si `extensions.rm` viaja también en el
  backup interno.

### 9.5 Tests

- Backend: card contract round-trip, `extensions.rm`, lorebook list/link,
  migration 0020, API routes, context loader with linked book.
- Frontend: create dialog navigation, section nav, create/character pages,
  fichas, lorebook summary/link, lorebooks list/detail, empty states, greeting
  picker, responsive states (RTL + maybe Playwright).
- Sin regresiones S129–S132.

---

## 10. Slice plan

### 10.1 S133 — Card-first character surface + IA shell

**Objetivo:** que el personaje se sienta como una card y que la creación deje
de ser un cajón de sastre.

Incluye:

- Sidebar: grupo «Biblioteca» + Lorebooks.
- Diálogo «Crear» con dos placas.
- `/characters/new` y `/characters/:id` con secciones + nav sticky + save bar.
- Sección Card con campos ST y avanzados plegados.
- Sección Fichas (renombre de «Tarjetas»).
- Sección Lorebook con resumen + enlace.
- Sección Versiones.
- Card contract `GET/PUT /api/characters/:id/card` + `extensions.rm`.
- Directorio de lorebooks (`/lorebooks`) y detalle/edición por libro existente
  (`/lorebooks/:id`) con el editor actual movido a `components/lorebook/`.
- Selector de saludo alternativo al iniciar conversación (candidato; si el
  slice crece, se mueve a S134).
- Import/export de cards en el listado/detalle.
- Tests y docs.

**Fuera de S133:** crear lorebooks sin personaje, vincular/desvincular,
import/export de lorebooks por libro, migración nullable.

### 10.2 S134 — Lorebook library

**Objetivo:** que los lorebooks sean ciudadanos de primera, no una pestaña.

Incluye:

- Migración `0020`: `character_id` nullable + índice único.
- `POST /api/lorebooks` (sin personaje), link/unlink, delete, import/export por
  libro.
- `/lorebooks` completo: crear, listar todos, filtrar vinculados/sin vincular.
- `/lorebooks/new` y `/lorebooks/:id` con secciones Identidad, Ajustes,
  Entradas, Vínculo.
- Controles de scan depth, token budget, recursive scanning.
- Vínculo opcional 1:1 y confirmación de reemplazo.
- Import/export de lorebooks desde la biblioteca.
- Tests, docs y release checks.

**Fuera de S134:** múltiples lorebooks por personaje, grupos, timed effects,
probabilidad, decoradores, assets V3.

### 10.3 Después

| Slice | Contenido                                             |
| ----- | ----------------------------------------------------- |
| S135  | Memoria estructurada + retrieval (antes S133)         |
| S136  | Políticas de contexto fast/balanced/deep (antes S134) |
| S137  | Tokenizer real y presupuesto (antes S135)             |

Actualizar la numeración en `docs/03-roadmap.md` y `PM-backlog.md` cuando el
plan se apruebe.

### 10.4 Criterios de aceptación S133

- El diálogo «Crear» solo contiene dos placas y un enlace de importación.
- `/characters/new` crea un personaje con identidad, card y fichas.
- `/characters/:id` muestra las cinco secciones sin tabs y guarda con barra
  sticky.
- «Tarjetas» ya no se usa para las fichas de conocimiento.
- El lorebook del personaje se muestra como resumen + enlace.
- La card export/import conserva `extensions.rm` y los campos desconocidos.
- `GET/PUT card` devuelve un envelope válido y crear una versión no rompe
  conversaciones existentes.
- El saludo alternativo se puede elegir al iniciar una conversación (si entra
  en S133).
- `pnpm check`, tests backend/frontend, build y audit en verde.

### 10.5 Criterios de aceptación S134

- Se puede crear un lorebook sin personaje.
- La biblioteca lista libros vinculados y sin vincular.
- Se puede vincular/desvincular un libro; el 1:1 se respeta.
- Los ajustes de libro se editan y afectan a la siguiente respuesta.
- Import/export por libro funciona en CCv3 y ST nativo.
- Las conversaciones existentes no se rompen al desvincular.
- Migración 0020 probada con datos existentes.
- `pnpm check`, tests, build y audit en verde.

### 10.6 Riesgos

| Riesgo                                   | Mitigación                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S133 demasiado grande                    | Si el selector de saludo o el directorio de lorebooks crecen, moverlos a S134 sin cambiar el diseño.                            |
| Duplicar fuentes de verdad card/columnas | Las columnas siguen siendo la fuente editable; `extensions.rm` solo serializa/restaura. Tests de round-trip.                    |
| Cross-feature imports                    | El editor de lorebooks vive en `components/lorebook/`; el resumen compartido en `components/shared/`; el personaje solo enlaza. |
| Migración 0020 y datos existentes        | Migración aditiva + tests de migración; el índice único se mantiene.                                                            |
| Pérdida de datos al desvincular          | El libro no se borra al desvincular; solo se pierde la asociación.                                                              |
| Scope creep hacia ST                     | Lista de fuera de alcance y revisión de RFC.                                                                                    |

---

## 11. Prototype plan

Se crearán prototipos HTML estáticos en `docs/prototypes/card-first/`,
reutilizando los tokens y fuentes de `docs/prototypes/prototype.css`. No son
código de producción.

| Archivo                              | Propósito                         | Interacciones                                        |
| ------------------------------------ | --------------------------------- | ---------------------------------------------------- |
| `index.html`                         | Hub de prototipos y navegación    | Links a las pantallas                                |
| `create-dialog.html`                 | Modal «Crear» sobre la biblioteca | Abrir/cerrar, hover/focus, dos placas                |
| `character-create.html`              | Crear personaje                   | Nav de secciones, plegar avanzados, fichas, save bar |
| `character-detail.html`              | Detalle/edición                   | Nav sticky, versiones, resumen de lorebook           |
| `lorebooks.html`                     | Biblioteca de lorebooks           | Grid, empty state, filtros                           |
| `lorebook-create.html`               | Crear lorebook                    | Identidad, ajustes, entradas, vínculo                |
| `lorebook-detail.html`               | Detalle/edición                   | Acordeones de entradas, ajustes, vínculo             |
| `mobile.html` o variantes responsive | Móvil                             | Chips de nav, save bar fija, placas apiladas         |

Contenido sintético:

- Personaje «Lyra» con tags, creador y card V3.
- Lorebook «Bosque de Lyra» con 3 entradas (una constante, una con secundarias,
  una con regex preservado).
- Personaje sin lorebook para el estado vacío.
- Lorebook sin vincular para S134.

Aprobación:

1. Revisar el brief y la IA de este documento.
2. Construir los prototipos HTML.
3. Revisar desktop y móvil; ajustar.
4. Aprobar el prototipo como referencia de S133/S134.
5. Recién entonces, `/slice S133` con el flujo de subagentes.

### 11.1 Decisiones tomadas en el prototipo

Los prototipos de `docs/prototypes/card-first/` ya están construidos. Estas
decisiones concretan el plan y deben pasar al RFC de S133/S134:

- **Barra de guardado.** En escritorio, la acción principal vive en el header
  (crear/guardar) y la barra de estado queda al final del formulario, sin tapar
  contenido. En móvil, la barra es sticky al pie; en las páginas de detalle
  solo aparece cuando hay cambios.
- **Navegación de prototipo.** La barra de páginas es un pie de página, no
  chrome fijo. El enlace **Prototipo** del topbar vuelve al hub.
- **Diálogo Crear.** Dos placas con ilustración abstracta (icono + gradiente),
  la misma altura y peso; el enlace de importar card queda en el pie.
- **Biblioteca de lorebooks.** Cards con lomo de color, metadatos a la vista y
  estado «Sin vincular» en chip discontinuo. La card de crear es discontinua.
- **Header de detalle.** En móvil, avatar e identidad van en la misma fila y
  las acciones pasan debajo; los placeholders de Tema/Idioma se ocultan para
  no romper el título.
- **Formularios.** Los avanzados de la card se pliegan; las fichas y las
  entradas usan el mismo patrón de lista con acciones discretas.
- **Verificación.** El detector de `impeccable` no reporta hallazgos
  primarios; solo advisories de tamaños/radios/colores fuera de DESIGN.md y de
  las etiquetas numeradas de sección, que son intencionales en el prototipo.
- **Pendiente de implementación:** selector de saludo alternativo al iniciar
  conversación (descrito en el plan, no incluido en el prototipo estático).

---

## 12. Open decisions

1. **Importar en el diálogo «Crear».** ¿Enlace terciario «Importar card» o
   dejar solo las dos placas y moverlo al listado? Recomendación: enlace
   terciario discreto.
2. **Selector de versión.** ¿En el header (como hoy) o dentro de la sección
   Versiones? Recomendación: header + sección Versiones con historial.
3. **Nombre del grupo del sidebar.** «Biblioteca» vs «Personajes».
   Recomendación: «Biblioteca».
4. **`nickname`.** ¿Columna propia en S133 o dentro de `extensions.rm`?
   Recomendación: `extensions.rm.nickname` en S133; columna si se usa como
   alias de display de forma estable.
5. **Saludo alternativo.** ¿S133 o S134? Recomendación: S133 si el slice no
   crece; si crece, S134.
6. **«Fichas» en inglés.** «Knowledge cards» vs «Cards». Recomendación:
   «Knowledge cards» para no colisionar con las cards de ST.
7. **Crear lorebook: vínculo al inicio o al final.** Recomendación: al final,
   después de las entradas, con opción «Vincular más tarde» en S134.
8. **Un solo botón de guardado o guardado por sección.** Recomendación: un
   guardado global con barra sticky; menos estados y menos errores.

---

## 13. Next steps

1. Revisar este plan y corregir cualquier decisión.
2. Construir los prototipos HTML de las siete pantallas.
3. Aprobar la dirección y el prototipo.
4. Crear el RFC de S133 con el flujo `/slice`.
5. Implementar S133, luego S134, luego volver a memoria/retrieval.

El criterio para avanzar: si el prototipo no deja claro en menos de un minuto
dónde se crea un personaje, dónde un lorebook y cómo se vinculan, la IA
todavía no está bien.
