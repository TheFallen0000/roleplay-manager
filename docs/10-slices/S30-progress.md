# S30 — Fondo del chat (PM.3 + PM.5, fase A)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Fondo de imagen opcional por conversación. No hay fondo por defecto: se
establece únicamente desde **Personalización**, con subida + recorte, modos de
ajuste, velo configurable, previsualización y opción de quitarlo. Se hereda en
ramas y se entrega con variantes responsive para que el teléfono no descargue el
original.

La fase B (export/import con deduplicación de imágenes compartidas y casilla
`conversations.images`) queda para S31.

## Decisiones

- **Sin fondo por defecto**: el campo nace `null`; la foto de perfil no se usa
  como fondo salvo que el usuario la suba explícitamente.
- **Modelo por conversación**: `backgroundImageAssetId` (nullable),
  `backgroundFit` (`cover` | `contain`, por defecto `cover`) y
  `backgroundScrim` (0–100, por defecto 0). La rama copia los tres campos.
- **Subida y recorte**: endpoint
  `POST /api/conversations/:id/customization/background` (multipart) con
  `usage: "background"`; el cropper usa aspecto 16:9 y las mismas validaciones de
  MIME/bytes/píxeles que el resto de imágenes.
- **Variantes por uso**: nueva variante `large` (1920 px). Perfil genera
  `thumbnail/small/medium`; fondo genera `small/medium/large` (sin thumbnail).
  El procesador acepta el set de variantes y el backfill lo deduce de las
  conversaciones que usan cada asset. El informe (`--report`) ahora incluye
  `backgroundVariant`/`backgroundBytes` y su porcentaje de ahorro.
- **Entrega**: `<img>` de capa detrás del área de mensajes con `srcset`/`sizes`
  (descriptores calculados con las dimensiones reales del asset, que viajan en
  `ConversationDetail.backgroundImageDimensions`), `medium` como `src`,
  `decoding="async"`; cabecera e input permanecen opacos. La capa cubre solo la
  zona de mensajes.
- **Ajuste y velo**: `Select` Cubrir/Contener y `Slider` 0–100 (paso 5) que se
  guardan al soltar (`onValueCommitted`), con previsualización en vivo
  (imagen + velo + mini-burbujas). Quitar fondo lo limpia y borra el asset si
  nadie más lo usa.
- **Borrado seguro por referencias**: al reemplazar/quitar una imagen
  (personalizada o fondo) solo se borra el asset si ninguna conversación lo
  referencia. Corrige el bug latente de ramas que compartían imagen
  personalizada y habrían quedado rotas.
- **Fix incidental**: las peticiones de streaming (`send`, `regenerate`,
  `continue`) ahora envían `Accept-Language`, así el prompt del LLM vuelve a
  seguir el idioma de la interfaz también en esos flujos.
- **Fuera de alcance (fase B, S31)**: exportar/importar las imágenes de
  conversación con deduplicación por asset y la nueva casilla del gestor de
  exportación.

## Criterios de aceptación

- [x] Sin fondo por defecto; el fondo solo se establece desde Personalización.
- [x] Subida con cropper (16:9), modos Cubrir/Contener, velo 0–100,
      previsualización y Quitar fondo.
- [x] Herencia en ramas de fondo, ajuste y velo.
- [x] Variantes de fondo (small/medium/large, sin thumbnail) y entrega con
      `srcset`/`sizes`; informe con bytes de fondo.
- [x] Borrado seguro: no se elimina un asset compartido por otras ramas.
- [x] `pnpm check` sin warnings; frontend (188) y backend (356) en verde.
- [x] Flujo completo verificado con base temporal: 2400×1350 → small 230 B /
      medium 668 B / large 3792 B (80% de ahorro frente a 19.395 B).

## Commits

1. `feat(shared): conversation background model and per-usage variants`
2. `feat(backend): conversation background storage, settings and delivery`
3. `feat(frontend): chat background input, preview and rendering`
4. `fix(frontend): send Accept-Language on streaming requests`
5. `test(background): cover variants, settings, refcount and UI`
6. `docs(backlog): mark PM.3 + PM.5 phase A in S30`
7. `release: bump to v1.22.0 and add changelog entry`
