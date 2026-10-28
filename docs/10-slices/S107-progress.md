# S107 — Paginación y listas acotadas

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Acota las listas que todavía podían crecer sin límite:

- **Personajes con paginación real:** `GET /api/characters` acepta `limit`
  (1–200) y `offset`; con esos parámetros devuelve
  `{ characters, hasMore, nextOffset }`. Sin parámetros mantiene el array
  anterior por compatibilidad. La home carga 60 y ofrece **Cargar más**.
- **Conversaciones acotadas:** `GET /api/conversations` acepta `characterIds`
  (lista separada por comas) y `limit` (máx. 1000). La home pide solo las
  conversaciones de los personajes ya cargados, con límite 500, en vez de
  cargar todas.
- **Memorias y resúmenes:** los casos de uso limitan por defecto a **500**
  elementos; las consultas SQL añaden `LIMIT` cuando se pasa el límite.
- **Consulta batch:** `ConversationRepository.listByCharacterIds` resuelve el
  filtro de conversaciones con un join, sin N+1.

No hay cambios de UI más allá del botón **Cargar más** en la lista de
personajes.

## Decisiones

- **Paginación por offset para personajes:** es un listado local y ordenado por
  `createdAt`/`id`; offset es suficiente y mantiene el código simple. El
  `nextOffset` es `null` cuando no hay más.
- **Ruta legacy sin parámetros:** devuelve el array completo para no romper
  clientes/tests existentes. La home usa la variante paginada.
- **Conversaciones por personajes cargados:** la home solo necesita las
  conversaciones de las cards visibles. El límite 500 evita un menú infinito;
  si un personaje supera ese número, se muestra el medio millar más reciente
  (paginación completa por personaje queda como trabajo futuro).
- **Memorias/resúmenes a 500:** no se añadió UI de paginación; 500 cubre de
  sobra el uso normal y evita cargar historiales patológicos. Se puede añadir
  “Cargar más” si aparece un caso real.
- **Sin cambios en logs/mensajes:** ya tenían límites propios.
- **Fuera de alcance:** paginación completa de conversaciones/memorias/
  resúmenes, virtualización de la lista de personajes y `deleteAssetIfUnreferenced`.

## Criterios de aceptación

- [x] `GET /api/characters?limit&offset` devuelve página con `hasMore` y
      `nextOffset`.
- [x] La home carga la primera página y permite cargar más.
- [x] `GET /api/conversations?characterIds&limit` filtra y acota.
- [x] `listByCharacterIds` usa un join (sin N+1).
- [x] Memorias y resúmenes tienen límite por defecto de 500.
- [x] Tests, `pnpm check`, build, smoke test, API y Playwright en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **648** tests (112 archivos), incluidos paginación de personajes,
  listas por personaje y límites.
- Frontend: **337** tests (57 archivos), incluido “Cargar más”.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- API real: página 1 y 2 de personajes con `hasMore` correcto; conversaciones
  filtradas por `characterIds`; `limit=0` devuelve 400.
- Playwright/Chromium: home, personajes, proveedores, tutoriales, updates y
  chat; 0 errores de consola y 0 violaciones CSP.

## Commits

1. `414904a feat(backend): paginate characters and bound list queries`
2. `a064d21 feat(frontend): load characters in pages`
3. `c71d109 test: cover character pagination and list bounds`
4. `docs(slice): document S107 pagination and S108 i18n decision` (this commit)
