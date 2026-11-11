# 15 — Plan UX/UI card-first (S133–S134)

**Estado:** Draft para revisión
**Fecha:** 2026-11-11
**Ámbito:** `packages/frontend`, `packages/backend`, `packages/shared` y
`packages/ui` si aparece una primitiva nueva.
**Referencias:** `docs/14-card-first-audit.md`,
`docs/16-lorebook-versioning.md`, `docs/10-slices/S132-progress.md`,
`docs/redesign-plan.md`, `docs/prototypes/`, `PRODUCT.md`, `DESIGN.md`.

> **Actualización 2026-11-11 — lorebooks versionados.** El modelo inicial de
> «biblioteca + vínculo 1:1» se sustituye por versiones de lorebook: editar un
> libro crea una versión nueva y cada versión de personaje fija una versión
> concreta del libro. Un libro puede estar enlazado a muchas versiones de
> personaje. El detalle está en `docs/16-lorebook-versioning.md`; este plan
> conserva la IA/UX y adopta ese modelo en las secciones marcadas.

---

## 1. Decisiones tomadas

| Tema                              | Decisión                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relación personaje–lorebook       | **Versiones de lorebook + vínculo por versión de personaje.** Un libro puede usarse por muchas versiones de personaje; una versión de personaje fija como máximo una versión de libro. |
| Versionado de lorebook            | **Editar crea una versión nueva.** Nombre, descripción, ajustes y entradas se versionan; las versiones antiguas son de solo lectura.                                                   |
| Destino de los flujos de creación | **Páginas dedicadas.** El diálogo «Crear» solo elige; `/characters/new` y `/lorebooks/new` contienen los formularios.                                                                  |
| Editor de personaje               | **Página con secciones y nav sticky.** Sin tabs; anclas y barra de guardado.                                                                                                           |
| Secuencia                         | **Personaje → Lorebooks → memoria/retrieval.** S133 personaje + versionado de lorebooks; S134 biblioteca completa; S135 vuelve a memoria.                                              |
| Crear personaje                   | **Esenciales + card + fichas + lorebook opcional** en la misma página, con avanzados plegados.                                                                                         |
| Lorebook dentro del personaje     | **Resumen de la versión enlazada + enlace.** La edición vive en la sección Lorebooks.                                                                                                  |
| Dirección visual                  | **Ink & Violet existente.** No se crea un mundo nuevo; se extiende el sistema actual.                                                                                                  |

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
| **Lorebook**  | Versión del libro enlazada a esta versión de personaje + abrir/cambiar/quitar                                                                                                      | Visible                                 |
| **Versiones** | Historial de versiones del personaje y libro/versión usado por cada una                                                                                                            | Visible en edición                      |

La nav sticky muestra las cinco secciones con un indicador de sección activa.
En creación, «Versiones» no aparece; el lorebook es una sección opcional.

### 4.5 Lorebook page sections

| Sección       | Contenido                                                    |
| ------------- | ------------------------------------------------------------ |
| **Identidad** | Nombre, descripción                                          |
| **Ajustes**   | Scan depth, token budget, recursive scanning, con ayudas     |
| **Entradas**  | Lista de entradas, añadir/editar/reordenar, import/export    |
| **Versiones** | Historial de versiones del libro, versión actual, restaurar  |
| **Vínculo**   | Versiones de personaje que usan esta versión, vincular/crear |
| **Peligro**   | Eliminar lorebook (soft delete)                              |

El libro existe de forma independiente. Cada versión de personaje fija una
versión concreta del libro; una versión puede estar enlazada a muchas
versiones de personaje. Ver `docs/16-lorebook-versioning.md`.

---

## 5. Flows

### 5.1 Crear personaje

1. Biblioteca de personajes → «Crear» → modal.
2. Elige «Personaje» → `/characters/new`.
3. La página abre en **Identidad** con nombre, subtítulo, imagen y descripción.
4. Puede completar **Card** (con avanzados plegados), **Fichas** y, de forma
   opcional, **Lorebook**: elegir libro + versión o dejarlo sin lorebook.
5. La barra de guardado muestra «Crear personaje» cuando los campos
   obligatorios están completos.
6. Al crear, la primera versión queda enlazada a la versión de lorebook
   elegida (o a ninguna) y va al detalle con un toast.

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
7. Cambiar el lorebook de la versión actual o quitar el libro también crea
   una versión nueva; la versión anterior conserva su libro y sigue
   funcionando.

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
5. Crear → libro con **v1** y detalle con toast.
6. No se enlazan personajes desde la creación: se vinculan después desde el
   personaje o desde el detalle del libro. Así crear un libro no crea versiones
   de personaje como efecto secundario.

### 5.5 Vincular una versión de lorebook a un personaje

1. Desde el detalle del personaje (sección Lorebook) o desde el detalle del
   libro (sección Vínculo).
2. Se elige **libro + versión**; por defecto, la versión actual del libro.
3. Vincular crea una **versión nueva del personaje** con esa versión de
   lorebook. No se muta la versión existente.
4. Si el personaje ya tenía un libro en su versión actual, la versión nueva lo
   reemplaza; la anterior conserva su copia.
5. El resumen del personaje y la lista de uso del libro se actualizan.

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
- La sección Lorebook muestra la **versión enlazada**: nombre, número de
  versión, entradas, scan depth, budget y recursión. Si el libro vivo está
  eliminado o tiene versiones más nuevas, se avisa. Acciones: «Abrir
  lorebook», «Cambiar lorebook» (crea versión nueva) y «Quitar lorebook» (crea
  versión nueva sin libro). Si no hay libro: CTA «Elegir lorebook» / «Crear
  lorebook».

### 6.3 Biblioteca de lorebooks

```
┌──────────────────────────────────────────────────────────────┐
│ Lorebooks                                  [Importar] [Crear]│
│ Libros de conocimiento que tus personajes pueden consultar.  │
│                                                              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│ │ Bosque de Lyra   │ │ Ciudad Sumergida │ │ + Crear       │ │
│ │ v3 · 12 entradas │ │ v1 · 4 entradas  │ │   lorebook    │ │
│ │ 2 personajes     │ │ Sin usar         │ │               │ │
│ └──────────────────┘ └──────────────────┘ └───────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- Card de lorebook: nombre, versión actual, número de entradas, uso agregado
  («Usado por 2 personajes · 3 versiones» o «Sin usar») y ajustes clave.
- Acciones: abrir, editar (crea versión nueva), exportar, eliminar.
- Empty state con mascota y CTA.
- Búsqueda y filtro «Todos / En uso / Sin usar» si el listado crece.

### 6.4 Detalle/edición de lorebook

- Header: nombre, versión actual, acciones (exportar, eliminar).
- Nav sticky: Identidad, Ajustes, Entradas, Versiones, Vínculo.
- Identidad: nombre, descripción.
- Ajustes: scan depth (0–64), token budget (0–100.000), recursive scanning,
  con explicaciones y valores por defecto.
- Entradas: lista de acordeones; cada entrada muestra nombre/comment, claves,
  posición, prioridad y un preview del contenido. El editor inline conserva
  todos los campos actuales.
- Versiones: historial con número, fecha, cambio y uso; versión antigua en
  modo lectura; «Restaurar como versión nueva».
- Vínculo: versiones de personaje que usan esta versión, agrupadas por
  personaje, con «Vincular a un personaje» (crea una versión nueva del
  personaje).
- Guardar crea una versión nueva del libro; la UI lo dice.
- Borrado: soft delete con el aviso de `docs/16-lorebook-versioning.md`.

### 6.5 Crear lorebook

Misma estructura que el detalle, pero con un botón «Crear lorebook» y sin paso
de vínculo obligatorio. El libro nace como v1; se puede vincular después a
personajes desde el detalle o desde el personaje.

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

- `GET /api/characters/:id/card?spec=v2|v3&versionId=` devuelve el envelope de
  la versión de personaje indicada (o la actual). `character_book` son los
  datos de la **versión de lorebook enlazada** a esa versión de personaje.
- `PUT /api/characters/:id/card` acepta un envelope, valida y crea una versión
  nueva del personaje. Si incluye `character_book`, crea o reutiliza un libro +
  versión de lorebook y enlaza la nueva versión de personaje a esa versión.
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
    lorebook?: {
      lorebookId: string
      lorebookVersionId: string
      versionNumber: number
      sourceKey: string
      originId?: string | null
    } | null
  }
  ```
- Al importar una card, `extensions.rm` se lee y se restauran los campos; al
  exportar, se escribe. ST ignora el namespace.
- La card es autocontenida: incluye el `character_book` exacto de la versión y
  los IDs/huella para reconstruir el historial.

### 8.2 Lorebook versioning (S133–S134)

El detalle completo está en `docs/16-lorebook-versioning.md`. Resumen:

- `lorebooks` es el contenedor vivo y editable; `lorebook_versions` guarda
  versiones inmutables (nombre, descripción, ajustes y `entries_json`).
- `lorebooks.current_version_id` apunta a la versión actual; editar crea una
  versión nueva (o no crea nada si el contenido canónico no cambió).
- `character_versions.lorebook_version_id` (FK nullable, `ON DELETE RESTRICT`)
  fija la versión exacta que usa esa versión de personaje.
- Una versión de personaje → cero o una versión de lorebook. Una versión de
  lorebook → muchas versiones de personaje.
- Borrar un libro es **soft delete** (`lorebooks.deleted_at`): las versiones
  se conservan y las versiones de personaje siguen funcionando.
- Migración `0020`: crear `lorebook_versions`, generar la v1 de cada libro
  existente y enlazar **todas** las versiones de personaje del personaje a esa
  v1. Eliminar el uso de `lorebooks.character_id` y su índice único.
- La creación transaccional actual (`CreateCharacterInput.lorebook`) pasa a
  crear libro + v1 + enlace de la primera versión.

### 8.3 API surface

| Método | Ruta                                             | Slice |
| ------ | ------------------------------------------------ | ----- |
| GET    | `/api/characters/:id/card`                       | S133  |
| PUT    | `/api/characters/:id/card`                       | S133  |
| GET    | `/api/lorebooks`                                 | S133  |
| GET    | `/api/lorebooks/:id`                             | S133  |
| GET    | `/api/lorebooks/:id/versions`                    | S133  |
| GET    | `/api/lorebooks/:id/versions/:versionId`         | S133  |
| POST   | `/api/lorebooks`                                 | S133  |
| PUT    | `/api/lorebooks/:id`                             | S133  |
| POST   | `/api/lorebooks/:id/versions/:versionId/restore` | S134  |
| DELETE | `/api/lorebooks/:id`                             | S134  |
| GET    | `/api/lorebooks/:id/usage?versionId=`            | S134  |
| POST   | `/api/lorebooks/:id/link`                        | S134  |
| POST   | `/api/lorebooks/import`                          | S134  |
| POST   | `/api/lorebooks/:id/export`                      | S134  |

Las rutas actuales por personaje (`/api/characters/:id/lorebook`) se mantienen
por compatibilidad y se mapean a la versión actual del libro del personaje.

### 8.4 Shared types

- `LorebookSummaryDTO`: id, currentVersion (versionNumber, name, entryCount,
  scanDepth, tokenBudget, recursiveScanning, sourceKey), usageCounts
  (characters, characterVersions), updatedAt.
- `LorebookVersionDTO`: id, lorebookId, versionNumber, name, description,
  settings, entries, sourceKey, createdAt.
- `CharacterVersionDTO.lorebookVersion`: summary of the linked version
  (lorebookId, versionId, versionNumber, name, entryCount, status: active |
  deleted | outdated).
- `CreateLorebookInput`, `UpdateLorebookInput`, `LinkLorebookInput`,
  `RestoreLorebookVersionInput`.
- `CharacterCardEnvelope` / `RmExtensions` with lorebook IDs/version/sourceKey.
- `CreateConversationInput.greeting` o `greetingIndex` (si S133 incluye el
  selector).
- i18n: `nav.lorebooks`, `nav.groupLibrary`, `create.*`, `lorebooks.*`,
  `characters.section*`, `characters.fichas*`, `characters.lorebookVersion*`.

### 8.5 Context and activation

- `ConversationContextLoader` resuelve la **versión de lorebook enlazada a la
  versión de personaje** de la conversación, no el libro vivo por personaje.
- La activación no cambia: el `PromptContextLorebook` sale de la versión y
  entra por el mismo camino del compilador S129.
- Editar un libro no cambia conversaciones existentes; cada una sigue con su
  versión de personaje y su versión de lorebook.
- Si se quita el lorebook de una versión de personaje, la conversación usa la
  nueva versión del personaje (sin libro) si se cambia la conversación; las
  conversaciones antiguas siguen fijadas a su versión.
- El manifiesto puede incluir `lorebook.versionNumber` y `sourceKey` para
  depurar.

### 8.6 Backward compatibility

- Exports antiguos sin `extensions.rm` importan como hasta ahora.
- Cards V1/V2/V3 sin `extensions.rm` conservan el comportamiento actual; su
  `character_book` se convierte en libro + v1 y se enlaza a la versión de
  personaje creada.
- Export interno: `EXPORT_SCHEMA_VERSION` sube a 2 (o se añade lectura aditiva);
  el import v1 de S132 convierte el `lorebook` de personaje en libro + v1 y lo
  enlaza a todas las versiones del personaje.
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
- `application/use-cases/character/lorebook/create-lorebook-version.use-case.ts`
- `application/use-cases/character/lorebook/list-lorebook-versions.use-case.ts`
- `application/use-cases/character/lorebook/link-character-version.use-case.ts`
- `application/use-cases/character/lorebook/get-lorebook-usage.use-case.ts`
- `infrastructure/adapters/primary/routes/lorebook.routes.ts` (rutas por
  libro/versión)
- `infrastructure/adapters/primary/routes/character.routes.ts` (card)
- `domain/entities/lorebook-version.entity.ts`
- `domain/ports/lorebook.repository.ts` (containers + versions + usage)
- `infrastructure/.../drizzle/repositories/drizzle-lorebook.repository.ts`
- `infrastructure/database/migrations/0020_lorebook_versions.sql` (S133)
- `containers/app-container.ts`

### 9.4 Shared and i18n

- `packages/shared/src/types/sillytavern-card.ts` o un nuevo
  `card-contract.ts` para `RmExtensions` y el envelope.
- `packages/shared/src/types/character.ts` para el DTO del card si aplica.
- `packages/shared/src/i18n/locales/es.ts` y `en.ts` con las claves nuevas.
- `packages/shared/src/types/export.ts` si `extensions.rm` viaja también en el
  backup interno.

### 9.5 Tests

- Backend: card contract round-trip, `extensions.rm`, lorebook versions,
  migration 0020 (v1 + links), usage queries, soft delete/restore, import
  matching, API routes, context loader with linked version.
- Frontend: create dialog navigation, section nav, create/character pages,
  fichas, lorebook version selector/summary, lorebooks list/detail/versions,
  usage list, delete warning, re-import dialog, empty states, greeting picker,
  responsive states (RTL + maybe Playwright).
- Sin regresiones S129–S132.

---

## 10. Slice plan

### 10.1 S133 — Card-first character surface + lorebooks versionados

**Objetivo:** que el personaje se sienta como una card y que el lorebook quede
versionado y fijado por versión de personaje.

Incluye:

- Sidebar: grupo «Biblioteca» + Lorebooks.
- Diálogo «Crear» con dos placas.
- `/characters/new` y `/characters/:id` con secciones + nav sticky + save bar.
- Sección Card con campos ST y avanzados plegados.
- Sección Fichas (renombre de «Tarjetas»).
- Sección Lorebook opcional en creación y resumen de la versión enlazada en
  detalle; selector libro + versión.
- Sección Versiones del personaje, con el libro/versión usado por cada una.
- Card contract `GET/PUT /api/characters/:id/card` + `extensions.rm` con IDs y
  huella de lorebook.
- Migración de datos: `lorebook_versions`, v1 de libros existentes,
  `character_versions.lorebook_version_id`, enlace de todas las versiones
  existentes a la v1.
- Backend de versiones: crear versión al guardar, listar versiones, cargar
  prompt/card desde la versión enlazada.
- Directorio de lorebooks (`/lorebooks`) y detalle con selector de versión y
  editor movido a `components/lorebook/`.
- Selector de saludo alternativo al iniciar conversación (candidato; si el
  slice crece, se mueve a S134).
- Import/export de cards en el listado/detalle.
- Tests y docs.

**Fuera de S133:** historial de uso completo, soft delete/restauración,
reimportación con reconstrucción, import/export de lorebooks por libro
(se pueden dejar para S134).

### 10.2 S134 — Biblioteca de lorebooks y versionado completo

**Objetivo:** que los lorebooks sean ciudadanos de primera, con historial y uso.

Incluye:

- `/lorebooks` completo: crear, listar todos, filtrar en uso/sin usar.
- `/lorebooks/new` y `/lorebooks/:id` con secciones Identidad, Ajustes,
  Entradas, Versiones y Vínculo.
- Historial de versiones, versión antigua read-only y «Restaurar como versión
  nueva».
- Uso por versión: «En uso por» e «Historial» agrupados por personaje.
- «Vincular a un personaje»: crea una versión nueva del personaje con la
  versión del libro.
- Soft delete + aviso + restauración al reimportar.
- Import/export por libro/versión; matching `origin_id`/`source_key` y
  reconstrucción con confirmación.
- Controles de scan depth, token budget, recursive scanning.
- Tests, docs y release checks.

**Fuera de S134:** múltiples lorebooks por versión de personaje, grupos, timed
effects, probabilidad, decoradores, assets V3, limpieza automática de versiones
huérfanas.

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
- `/characters/new` crea un personaje con identidad, card, fichas y lorebook
  opcional (libro + versión).
- `/characters/:id` muestra las cinco secciones sin tabs y guarda con barra
  sticky.
- «Tarjetas» ya no se usa para las fichas de conocimiento.
- El lorebook del personaje muestra la versión exacta enlazada y su estado.
- Cambiar o quitar el lorebook crea una versión nueva del personaje.
- La card export/import conserva `extensions.rm`, los campos desconocidos y el
  `character_book` de la versión enlazada.
- `GET/PUT card` devuelve un envelope válido y crear una versión no rompe
  conversaciones existentes.
- Migración de datos probada: libros existentes → v1; todas las versiones de
  personaje existentes → v1.
- El prompt y el preview usan la versión enlazada, no el libro vivo.
- `pnpm check`, tests backend/frontend, build y audit en verde.

### 10.5 Criterios de aceptación S134

- Se puede crear un lorebook sin personaje y nace como v1.
- Editar un libro crea una versión nueva; las versiones antiguas son de solo
  lectura.
- La biblioteca lista libros en uso y sin usar, con versión actual y uso.
- La página del libro muestra historial, uso por versión y versión antigua
  read-only.
- «Vincular a un personaje» crea una versión nueva del personaje con esa
  versión del libro.
- Soft delete con aviso; las versiones de personaje siguen funcionando.
- Reimportar un libro idéntico ofrece reconstruir el historial con
  confirmación; contenido distinto no reconstruye.
- Import/export por libro/versión funciona en CCv3 y ST nativo.
- Las conversaciones existentes no se rompen al editar, borrar o reimportar.
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

| Archivo                              | Propósito                         | Interacciones                                                           |
| ------------------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| `index.html`                         | Hub de prototipos y navegación    | Links a las pantallas                                                   |
| `create-dialog.html`                 | Modal «Crear» sobre la biblioteca | Abrir/cerrar, hover/focus, dos placas                                   |
| `character-create.html`              | Crear personaje                   | Nav de secciones, plegar avanzados, fichas, lorebook opcional, save bar |
| `character-detail.html`              | Detalle/edición                   | Nav sticky, versiones, versión de lorebook enlazada                     |
| `lorebooks.html`                     | Biblioteca de lorebooks           | Grid, versión actual, uso, filtros, empty state                         |
| `lorebook-create.html`               | Crear lorebook                    | Identidad, ajustes, entradas, v1, vincular después                      |
| `lorebook-detail.html`               | Detalle/edición                   | Acordeones, ajustes, historial de versiones, uso                        |
| `mobile.html` o variantes responsive | Móvil                             | Chips de nav, save bar fija, placas apiladas                            |

Contenido sintético:

- Personaje «Lyra» con tags, creador y card V3; ejemplo precargado en la
  pantalla de creación, con placeholders al vaciar los campos.
- Lorebook «Bosque de Lyra» con v3 y 3 entradas (una constante, una con
  secundarias, una con regex preservado); v1/v2 en el historial.
- Uso: Lyra v3 enlazada a Bosque de Lyra v3; Lyra v1 usó v1; Capitana Ellis v1
  usa v2.
- Personaje sin lorebook para el estado vacío.
- Lorebook sin usar para S134.
- Aviso de borrado y nota de reconstrucción por huella.

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
- **Biblioteca de lorebooks.** Cards con lomo de color, versión actual, uso
  agregado y estado «Sin usar» en chip discontinuo. La card de crear es
  discontinua.
- **Lorebook versionado.** El detalle tiene selector de versión, historial,
  versión antigua read-only y uso por versión; el personaje muestra la versión
  exacta enlazada.
- **Header de detalle.** En móvil, avatar e identidad van en la misma fila y
  las acciones pasan debajo; los placeholders de Tema/Idioma se ocultan para
  no romper el título.
- **Formularios.** Los avanzados de la card se pliegan; las fichas y las
  entradas usan el mismo patrón de lista con acciones discretas. La pantalla
  de creación muestra contenido precargado y, al vaciar un campo, aparece su
  placeholder.
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
7. **Crear lorebook: ¿vincular al crear?** Recomendación: no; crear el libro
   como v1 y vincular después desde el personaje o el detalle, para no crear
   versiones de personaje como efecto secundario.
8. **Un solo botón de guardado o guardado por sección.** Recomendación: un
   guardado global con barra sticky; menos estados y menos errores.
9. **¿Qué se versiona en un lorebook?** Recomendación: nombre, descripción,
   ajustes y entradas; renombrar crea versión. Alternativa: nombre estable en
   el contenedor.
10. **¿Cómo se borra un lorebook?** Recomendación: soft delete del contenedor;
    versiones conservadas; restauración al reimportar.
11. **¿Reconstrucción en S134 o después?** Recomendación: S134 si cabe; si no,
    guardar `source_key` y dejar la UI para S135.
12. **¿La creación real empieza vacía o con un ejemplo precargado?**
    Recomendación: vacía con placeholders; el contenido precargado es solo una
    demo del prototipo para enseñar el placeholder al borrar.

---

## 13. Next steps

1. Revisar este plan y `docs/16-lorebook-versioning.md`; corregir cualquier
   decisión.
2. Actualizar los prototipos HTML al modelo de versiones de lorebook y a los
   placeholders solicitados.
3. Aprobar la dirección y los prototipos.
4. Crear el RFC de S133 con el flujo `/slice`.
5. Implementar S133, luego S134, luego volver a memoria/retrieval.

El criterio para avanzar: si el prototipo no deja claro en menos de un minuto
dónde se crea un personaje, dónde un lorebook y cómo se vinculan, la IA
todavía no está bien.
