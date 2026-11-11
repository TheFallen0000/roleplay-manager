# 16 — Versionado de lorebooks y vínculo con personajes

**Estado:** Draft para revisión
**Fecha:** 2026-11-11
**Sustituye:** el modelo «biblioteca + vínculo 1:1» de
`docs/15-card-first-ux-plan.md` y la idea de snapshots separados.
**Referencias:** `docs/14-card-first-audit.md`,
`docs/15-card-first-ux-plan.md`, `docs/10-slices/S132-progress.md`.

---

## 1. Resumen

Los lorebooks pasan a tener **versiones inmutables**, igual que los
personajes. Editar un lorebook crea una versión nueva; las versiones
anteriores se conservan y son de solo lectura. Cada **versión de personaje**
fija una **versión concreta de lorebook**, no un libro vivo.

Esto sustituye el snapshot oculto por una entidad de primera clase:

- Un lorebook puede estar enlazado a muchas versiones de personaje (y a varios
  personajes).
- Una versión de personaje tiene como máximo una versión de lorebook.
- La versión actual de un personaje tiene como máximo un lorebook; versiones
  antiguas pueden tener otro.
- El prompt y la card usan exactamente la versión enlazada, no el libro vivo.
- Editar el libro no cambia versiones antiguas; para aplicar cambios hay que
  crear una versión nueva del personaje con la versión nueva del libro.

Es más trabajo de UI que un snapshot, pero es más claro, más controlable y
resuelve el caso v1 → libro A, v2 → libro B sin malabares.

---

## 2. Por qué versiones y no snapshots

Un snapshot es un detalle de implementación; una versión es un concepto que el
usuario entiende y puede elegir.

| Necesidad                | Snapshot oculto                                            | Versiones de lorebook                                   |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| v1 usa A, v2 usa B       | Funciona, pero el usuario no ve qué copia usa cada versión | El selector muestra «Bosque de Lyra · v3» por versión   |
| Editar el libro          | Hay que explicar que el snapshot no cambia                 | 「Guardar crea una versión nueva»; historial visible    |
| Elegir una copia antigua | No hay UI                                                  | Selector de versiones del libro                         |
| Borrar el libro          | Las versiones quedan huérfanas                             | Soft delete; las versiones siguen y se pueden restaurar |
| Reimportar               | Se compara contra snapshots                                | Se compara contra versiones y se restaura el historial  |

La versión inmutable **es** la captura. No hace falta una tabla de snapshots
paralela.

---

## 3. Modelo

### 3.1 Entidades

```
lorebooks
  id
  origin_id?            -- identidad estable si el archivo la trae o la genera RM
  current_version_id    -- versión editable actual
  deleted_at?           -- soft delete
  created_at
  updated_at

lorebook_versions
  id
  lorebook_id
  version_number        -- 1, 2, 3…
  name
  description
  scan_depth
  token_budget
  recursive_scanning
  entries_json          -- copia completa e inmutable de las entradas
  source_key            -- SHA-256 canónico del contenido
  created_at

character_versions
  ...
  lorebook_version_id?  -- FK a lorebook_versions (ON DELETE RESTRICT)
```

La **cabeza editable** sigue siendo `lorebooks` + `lorebook_entries` (las
tablas actuales). `lorebook_versions` guarda la copia inmutable de cada
guardado. `current_version_id` apunta a la última versión; el editor carga la
cabeza viva y guardar crea una versión nueva.

### 3.2 Reglas

- **Qué se versiona:** nombre, descripción, ajustes (`scan_depth`,
  `token_budget`, `recursive_scanning`) y entradas. Renombrar también crea una
  versión; el historial es completo.
- **Número de versión:** entero por libro, empieza en 1.
- **Sin cambios:** si el contenido canónico no cambia, no se crea una versión
  nueva (evita ruido).
- **Versiones antiguas:** solo lectura. «Editar» una versión antigua crea una
  versión nueva a partir de ella y actualiza la cabeza viva.
- **Versión actual:** la que apunta `current_version_id`. La biblioteca muestra
  el nombre de la versión actual.
- **Borrar una versión:** no se permite si alguna versión de personaje la
  referencia. Las versiones no referenciadas se pueden borrar en una limpieza
  futura; no es parte de S133/S134.
- **Borrar un libro:** soft delete del contenedor. Las versiones se conservan
  porque las versiones de personaje las referencian.

---

## 4. Vínculo con personajes

- `character_versions.lorebook_version_id` nullable.
- Una versión de personaje → cero o una versión de lorebook.
- Una versión de lorebook → muchas versiones de personaje.
- Un personaje (contenedor) puede tener versiones con libros distintos; la
  versión actual solo tiene uno.
- El selector de lorebook del personaje muestra **libro + versión**, por
  ejemplo «Bosque de Lyra · v3». Por defecto, la versión actual del libro.
- Se puede elegir una versión antigua; la UI la marca como «versión antigua» y
  avisa de que no recibirá cambios del libro.
- Cambiar el lorebook de una versión de personaje **crea una versión nueva del
  personaje**. No se muta la versión existente.
- Quitar el lorebook de una versión de personaje también crea una versión nueva
  sin lorebook.

### 4.1 Qué ve el personaje

La sección Lorebook del personaje muestra:

- Nombre del libro y **número de versión** enlazado.
- Número de entradas y ajustes de esa versión.
- Estado del libro vivo: activo, editado (hay versiones más nuevas) o eliminado.
- Si la versión enlazada no es la actual del libro: «Esta versión usa una copia
  anterior del libro».
- Acciones: abrir el libro, cambiar de versión/libro (crea versión nueva),
  quitar el libro (crea versión nueva).

### 4.2 Qué ve el lorebook

La sección Vínculo del lorebook muestra, para la versión seleccionada:

- «En uso por»: versiones de personaje que apuntan exactamente a esa versión.
- «Historial»: versiones de personaje que usaron versiones anteriores del
  libro.
- Acción «Vincular a un personaje»: elige personaje y crea una **versión nueva**
  de ese personaje con esta versión del libro. La UI lo dice explícitamente.
- La lista se agrupa por personaje y muestra `v3 · actual` o `v2 · histórica`.

---

## 5. Borrado

### 5.1 Borrar un lorebook

Soft delete del contenedor (`deleted_at`). Las versiones se conservan.

Aviso al usuario:

> Se eliminará **Bosque de Lyra** de la biblioteca. Las versiones de personaje
> que lo usaron conservarán su copia y seguirán funcionando, pero no podrás
> consultar qué personajes lo usaban ni vincularlo a nuevas versiones.
> ¿Eliminar?

Consecuencias:

- La biblioteca deja de mostrarlo.
- Las versiones de personaje que lo usan siguen funcionando con su versión.
- La página del personaje muestra «Lorebook eliminado · Bosque de Lyra v3» y
  permite seguir usando la copia; no permite abrir el libro vivo.
- No se puede enlazar a nuevas versiones de personaje.
- El historial de uso se oculta en la UI; los datos quedan para una posible
  restauración.

### 5.2 Borrar un personaje o una versión

- Borrar un personaje borra sus versiones; los lorebooks vivos no se tocan.
- Las versiones de lorebook que solo usaba ese personaje quedan en el historial
  del libro; no se borran automáticamente.
- Una limpieza futura puede eliminar versiones de lorebook no referenciadas,
  pero no es parte de este alcance.

---

## 6. Reimportar y reconstruir historial

Cada versión de lorebook tiene una **huella canónica** (`source_key`) y el
contenedor puede tener un **`origin_id`**.

### 6.1 Identidad

- **`origin_id`:** UUID estable que RM escribe en `extensions.rm` al exportar.
  Sirve para reconocer un libro exportado por RM aunque se renombre o se mueva
  de instalación.
- **`source_key`:** SHA-256 de una serialización canónica del contenido
  (nombre, descripción, ajustes y entradas; sin IDs locales ni timestamps).
  Sirve para reconocer el mismo contenido venga de donde venga.

Orden de matching al importar:

1. `origin_id` si el archivo lo trae.
2. `source_key` de la versión.
3. Si no hay match, se crea un libro nuevo con versión 1.

### 6.2 Casos

| Caso                                            | Resultado                                                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Libro vivo con la misma versión                 | Se ofrece reutilizarlo en vez de duplicarlo.                                                                                                                         |
| Libro eliminado con una versión idéntica        | Se ofrece restaurar el contenedor y reenganchar el historial. Las versiones de personaje ya apuntan a esa versión; al restaurar, vuelven a aparecer en «En uso por». |
| Libro vivo con contenido distinto               | Se ofrece crear una versión nueva o un libro nuevo; el usuario decide.                                                                                               |
| Libro eliminado con contenido distinto          | No se reconstruye el historial antiguo; se crea un libro nuevo. Las versiones antiguas siguen funcionando con su copia.                                              |
| Libro creado manualmente con contenido idéntico | El `source_key` puede coincidir. Se ofrece reconstruir, pero el usuario confirma; no se hace en silencio.                                                            |
| Libro creado manualmente con contenido distinto | No coincide; libro nuevo.                                                                                                                                            |

La reconstrucción **no toca** las versiones de personaje: solo restaura el
contenedor vivo y los enlaces de historial que ya existían. El prompt y las
cards siguen usando las versiones inmutables.

### 6.3 Límites

- Si el libro fue editado entre versiones, solo se pueden reenganchar las
  versiones cuyo `source_key` coincida. Las demás siguen funcionando, pero su
  historial no se restaura contra el libro nuevo.
- Si el usuario creó un libro manual idéntico, la huella coincide; la
  restauración es una elección explícita, no automática.
- Si el archivo no trae `origin_id` y el contenido cambió, no hay forma de
  saber que es «el mismo» libro. Es el límite correcto: mismo contenido =
  misma identidad; contenido distinto = libro distinto.

---

## 7. Migración desde S132

S132 tiene `lorebooks.character_id` (1:1 con el personaje) y las versiones de
personaje no guardan el libro. Migración:

1. Crear `lorebook_versions`.
2. Para cada `lorebooks` existente, crear su **v1** con la cabeza viva actual
   (nombre, descripción, ajustes y entradas), calcular `source_key` y apuntar
   `current_version_id`.
3. Añadir `character_versions.lorebook_version_id`.
4. Para cada personaje con libro, enlazar **todas sus versiones existentes** a
   la v1. Así las conversaciones antiguas siguen viendo el mismo libro.
5. Eliminar el uso de `lorebooks.character_id` y su índice único. La columna
   puede quedarse como legado temporal o eliminarse en una migración posterior.
6. La creación transaccional de S132 (`CreateCharacterInput.lorebook`) pasa a
   crear libro + v1 + enlace de la primera versión del personaje.

La migración es de datos, no solo de schema: hay que serializar las entradas
actuales a JSON y enlazar versiones. Se implementará en el backend con tests de
migración.

---

## 8. Schema propuesto

### 8.1 `lorebooks`

- `id` text PK.
- `origin_id` text nullable, índice.
- `current_version_id` text nullable, FK a `lorebook_versions.id`.
- `deleted_at` integer nullable.
- `created_at`, `updated_at`.
- Se elimina `character_id` (o queda como legado).
- La cabeza viva (`name`, `description`, `scan_depth`, `token_budget`,
  `recursive_scanning`) se mantiene para edición y listado.
- `lorebook_entries` sigue siendo la cabeza viva editable.

### 8.2 `lorebook_versions`

- `id` text PK.
- `lorebook_id` text FK a `lorebooks.id` (RESTRICT; el borrado es soft).
- `version_number` integer.
- `name`, `description`, `scan_depth`, `token_budget`, `recursive_scanning`.
- `entries_json` text (JSON completo).
- `source_key` text, índice.
- `created_at` integer.
- Índice único `(lorebook_id, version_number)`.
- Índice por `source_key`.

### 8.3 `character_versions`

- `lorebook_version_id` text nullable, FK a `lorebook_versions.id`
  `ON DELETE RESTRICT`.
- Índice por `lorebook_version_id`.
- No se guarda un snapshot aparte: la versión de lorebook es la captura.

### 8.4 `lorebooks.current_version_id`

- FK a `lorebook_versions.id` `ON DELETE SET NULL` (si se borra una versión no
  referenciada en una limpieza futura, el contenedor se queda sin current y la
  UI muestra la última disponible).

---

## 9. API

| Método | Ruta                                             | Uso                                                                              |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| GET    | `/api/lorebooks`                                 | Biblioteca: contenedores vivos, versión actual, uso.                             |
| GET    | `/api/lorebooks/:id`                             | Detalle con versión actual y metadatos.                                          |
| GET    | `/api/lorebooks/:id/versions`                    | Historial de versiones.                                                          |
| GET    | `/api/lorebooks/:id/versions/:versionId`         | Versión concreta (para el selector y el prompt/card).                            |
| POST   | `/api/lorebooks`                                 | Crear libro + v1.                                                                |
| PUT    | `/api/lorebooks/:id`                             | Editar la cabeza y crear una versión nueva.                                      |
| POST   | `/api/lorebooks/:id/versions/:versionId/restore` | Crear una versión nueva a partir de una antigua.                                 |
| DELETE | `/api/lorebooks/:id`                             | Soft delete.                                                                     |
| GET    | `/api/lorebooks/:id/usage?versionId=`            | Versiones de personaje que usan una versión.                                     |
| POST   | `/api/lorebooks/:id/link`                        | Vincular una versión a un personaje: crea una versión nueva del personaje.       |
| POST   | `/api/lorebooks/import`                          | Importar; matching por `origin_id`/`source_key`; opción `restore`.               |
| POST   | `/api/lorebooks/:id/export`                      | Exportar libro/versión.                                                          |
| GET    | `/api/characters/:id/card?versionId=`            | Card de una versión de personaje; `character_book` = versión enlazada.           |
| PUT    | `/api/characters/:id/card`                       | Crear versión de personaje; `character_book` crea/reutiliza versión de lorebook. |

Las rutas actuales por personaje (`/api/characters/:id/lorebook`) se mantienen
como compatibilidad y se mapean a la versión actual del libro del personaje.

---

## 10. UI

### 10.1 Crear personaje

- Sección **Lorebook (opcional)** al final, antes del guardado.
- Selector de libro + versión: «Bosque de Lyra · v3».
- Estado vacío: placeholder «Elegir lorebook» y opción «Sin lorebook».
- Si se elige una versión antigua, aviso «Versión antigua; no recibirá cambios
  del libro».
- Ayuda: «Esta versión guardará una copia congelada del libro. Editar el libro
  después no cambiará esta versión.»
- El ejemplo precargado del prototipo usará «Bosque de Lyra · v3».

### 10.2 Detalle de personaje

- Sección Lorebook: nombre + versión, entradas, ajustes, estado del libro vivo.
- Si el libro está eliminado: «Lorebook eliminado · Bosque de Lyra v3. Esta
  versión conserva una copia y sigue funcionando.»
- Si hay una versión más nueva del libro: «Hay una versión más reciente
  (v4). Esta versión usa v3.»
- Acciones: «Cambiar lorebook» (crea versión nueva del personaje), «Quitar
  lorebook» (crea versión nueva sin libro), «Abrir lorebook» (si vive).
- Lista de versiones del personaje: cada fila muestra el libro y versión
  usados.

### 10.3 Crear lorebook

- Crea la v1.
- No enlaza personajes por sorpresa; muestra «Podrás vincularlo desde el
  personaje o desde el detalle del libro».
- El guardado dice «Crear lorebook»; el resultado es v1.

### 10.4 Detalle de lorebook

- Header con selector de versión: «v3 · actual» y dropdown de versiones.
- Versión antigua: banner «Estás viendo una versión antigua. Es de solo
  lectura; guardar crea una versión nueva a partir de ella.»
- Sección **Versiones**: historial con número, fecha, cambio y uso.
- Sección **Vínculo**: «En uso por» (versiones de personaje) e «Historial»;
  botón «Vincular a un personaje» con aviso de que crea una versión nueva.
- Borrado: diálogo con el texto de la sección 5.1.
- Exportar: versión seleccionada.

### 10.5 Biblioteca de lorebooks

- Cada card muestra nombre, versión actual, número de entradas y uso:
  «Usado por 2 personajes · 3 versiones» o «Sin usar».
- La card de crear es discontinua.
- Filtros: Todos / En uso / Sin usar.
- El borrado soft delete oculta la card de la biblioteca.

### 10.6 Reimportar

Si el import encuentra un match:

- «Hemos encontrado un lorebook con el mismo contenido: Bosque de Lyra v3,
  usado por Lyra v2 y Capitana Ellis v1. ¿Quieres restaurar el historial o
  crear un libro nuevo?»
- Opciones: «Restaurar historial» / «Crear libro nuevo».
- Si el libro estaba eliminado, restaurar lo devuelve a la biblioteca y
  reengancha las versiones de personaje que ya apuntaban a esa versión.
- Si el contenido difiere, no se ofrece restaurar; se crea un libro nuevo.

---

## 11. Card y export interno

### 11.1 Card de personaje

- `character_book` = datos de la versión de lorebook enlazada (no del libro
  vivo).
- `extensions.rm.lorebook`:
  ```ts
  {
    lorebookId: string
    lorebookVersionId: string
    versionNumber: number
    sourceKey: string
    originId?: string | null
  }
  ```
- La card es autocontenida: se puede importar en otra instalación y la versión
  de personaje conserva el libro exacto.
- Al importar una card, su `character_book` se convierte en libro + versión
  (o se reutiliza por `origin_id`/`source_key`); la versión de personaje se
  enlaza a esa versión.

### 11.2 Export interno

- `EXPORT_SCHEMA_VERSION` sube a 2 (o se añade compatibilidad aditiva).
- Incluye `lorebooks` con contenedores y `versions` (JSON completo).
- Cada versión de personaje incluye `lorebookVersionId`.
- El import v1 (S132) se migra: su `lorebook` de personaje se convierte en
  libro + v1 y se enlaza a todas las versiones del personaje.
- El import v2 restaura vínculos exactos y puede reutilizar libros existentes
  por `origin_id`/`source_key`.

---

## 12. Consecuencias y casos límite

1. **Editar un libro no actualiza personajes.** Hay que crear una versión
   nueva del personaje con la versión nueva del libro. La UI debe ofrecerlo.
2. **La lista de uso distingue versiones.** Una versión de personaje puede
   estar en una versión antigua del libro; no es lo mismo «en uso» que «usa la
   versión actual».
3. **Renombrar crea versión.** El nombre forma parte del contenido versionado;
   las versiones antiguas conservan el nombre antiguo.
4. **Seleccionar una versión antigua es válido, pero debe avisarse.** El
   selector por defecto es la versión actual.
5. **Borrar el libro es soft delete.** Las versiones se conservan; el historial
   se oculta; la restauración es posible al reimportar.
6. **Borrar una versión referenciada no se permite.** La FK es RESTRICT.
7. **Borrar un personaje no borra el libro.** El historial del libro conserva
   las versiones usadas; la limpieza de versiones huérfanas es futura.
8. **Reimportar solo reconstruye contenido idéntico.** El `origin_id` ayuda si
   el archivo lo trae; el `source_key` es el fallback.
9. **El libro manual idéntico puede coincidir.** Se ofrece restaurar, pero el
   usuario confirma; no es automático.
10. **La card antigua sigue siendo válida.** Incluye su `character_book` y la
    información de versión; no depende de que el libro vivo exista.
11. **La migración de S132 es de datos.** Hay que crear v1 y enlazar todas las
    versiones existentes; los tests de migración son obligatorios.
12. **El prompt no cambia de forma.** El compilador S129 sigue recibiendo un
    `PromptContextLorebook`; la diferencia es que sale de la versión enlazada.
13. **El manifiesto puede mostrar la versión.** Añadir `lorebook.versionNumber`
    y `lorebook.sourceKey` al manifiesto es útil para depurar.
14. **Las conversaciones siguen fijadas a su versión de personaje.** La versión
    de personaje fija la versión de lorebook; nada más cambia.

---

## 13. Slices

### S133 — Personaje card-first + lorebooks versionados (fundación)

- Migración de datos y schema: `lorebook_versions`,
  `character_versions.lorebook_version_id`, v1 para libros existentes, enlace
  de todas las versiones de personaje existentes.
- Backend: entidad/repositorio de versiones, crear versión al guardar, listar
  versiones, enlazar versión a versión de personaje, cargar prompt/card desde
  la versión.
- Character create/detail con sección Lorebook opcional y selector
  libro+versión.
- Card export/import con `character_book` de la versión y `extensions.rm`.
- Lorebook create v1 + biblioteca/detalle básico con selector de versión.
- Tests de migración, round-trip, prompt y card.

### S134 — Biblioteca de lorebooks completa

- Historial de versiones, restaurar versión, uso por versión, vincular a
  personajes (crea versión nueva).
- Soft delete + aviso + restauración al reimportar.
- Import/export por libro/versión, matching `origin_id`/`source_key`.
- Filtros, estados vacíos, versión antigua read-only.
- Tests de uso, borrado, reimportación y UI.

### Después

- S135 memoria/retrieval.
- S136 políticas de contexto.
- S137 tokenizer.

---

## 14. Cambios en los prototipos

- **Crear personaje:** contenido precargado + placeholders en todos los campos
  posibles; sección Lorebook opcional con selector libro+versión; fichas
  editables con placeholders; placeholder de imagen.
- **Detalle de personaje:** sección Lorebook con la versión exacta y estado del
  libro vivo; versiones del personaje con el libro/versión usado.
- **Biblioteca de lorebooks:** versión actual y uso agregado.
- **Crear lorebook:** v1, sin vínculo obligatorio; nota de vincular después.
- **Detalle de lorebook:** selector de versión, historial, uso por versión,
  aviso de borrado y nota de reimportación.
- **README:** actualizar la descripción del modelo.

---

## 15. Decisiones abiertas

1. **Nombre versionado o estable.** Recomendación: versionar nombre,
   descripción, ajustes y entradas; renombrar crea versión. La alternativa es
   un nombre estable en el contenedor y versionar solo contenido/ajustes.
2. **Soft delete vs hard delete con versiones conservadas.** Recomendación:
   soft delete del contenedor; versiones conservadas; restauración al
   reimportar.
3. **Vincular al crear lorebook.** Recomendación: no; crear el libro y
   vincular después desde el personaje o el detalle. Evita crear versiones de
   personaje como efecto secundario de crear un libro.
4. **Reconstrucción en S134 o después.** Recomendación: S134 si el alcance
   cabe; si no, dejar el `source_key` y la UI de restauración para S135.
5. **Limpieza de versiones huérfanas.** Recomendación: diferir; no borrar
   versiones automáticamente en S133/S134.
