# S28 — Variantes responsive para imágenes de perfil (PM.19)

**Estado:** Completado
**Inicio:** 2026-10-05
**Fin:** 2026-10-05

## Descripción

Optimiza la entrega de imágenes de perfil ya existentes, manteniendo el original
en el almacenamiento local. Cards y avatares del chat dejan de descargar
innecesariamente el original cuando existe una variante apropiada. Esto prepara
la app para uso remoto/móvil sin añadir almacenamiento externo.

## Decisiones

- **Alcance**: fotos de perfil utilizadas en cards, avatar del chat y preview de
  edición. No incluye selección de fondo ni nuevos modos de recorte: PM.3 + PM.5
  siguen diferidos.
- **Original inmutable**: los archivos originales se siguen guardando en su ruta
  actual y continúan siendo la fuente de edición y exportación. Las variantes se
  guardan en un directorio lateral por asset; no se guardan imágenes en SQLite.
- **Tres variantes WebP deterministas**: `thumbnail` (máx. 128 px), `small`
  (máx. 384 px) y `medium` (máx. 768 px). Se conserva la relación de aspecto,
  no se amplía una fuente pequeña y las variantes que acaban con igual anchura se
  deduplican. No se crea una variante `large`: el endpoint del original sigue
  disponible, pero no se incluye en el `srcset` de cards para que un teléfono no
  elija accidentalmente una foto original enorme.
- **MIME**: Sharp vive únicamente en infraestructura. PNG/JPEG/WebP producen
  variantes WebP; GIF conserva animación y se sirve desde el original sin
  conversiones.
- **Seguridad de decodificación**: además del límite de bytes por upload (3 MB
  en S28, ampliado a 15 MB en v1.20.0), se limita por defecto la imagen
  decodificada a 40 MP (`MAX_PROFILE_IMAGE_PIXELS`, configurable). Se comprueba
  que el contenido decodificado coincida con el MIME.
- **Flujo común**: un servicio de aplicación usa el puerto de procesamiento y
  almacenamiento para uploads de perfil, imágenes personalizadas de chat e
  importación. Si falla el registro en SQLite o la escritura de una variante,
  limpia los archivos parciales.
- **Dimensiones**: `character_assets` guarda ancho/alto originales, obtenidos con
  orientación EXIF aplicada. Las columnas son nullable para permitir backfill
  incremental; las dimensiones alimentan descriptores `srcset` reales.
- **Sin tabla de variantes**: los nombres permitidos y rutas derivadas son
  deterministas; la existencia de cada archivo representa su disponibilidad.
- **API**: `GET /api/characters/:id/assets/:assetId?variant=thumbnail|small|medium`.
  Sin query sigue sirviendo el original. Variantes usan
  `private, max-age=31536000, immutable`: el `assetId` cambia cuando se sustituye
  la imagen, así que la URL de una variante es inmutable.
- **Backfill**: `pnpm --filter @workspace/backend assets:backfill-variants`
  procesa assets existentes, añade los sidecars que faltan y completa las
  dimensiones. `--dry-run` informa cuántos faltan y cuántos bytes producirían;
  repetir el comando no reescribe variantes existentes. Los errores se reportan
  por asset y hacen que el comando termine con código distinto de cero.
- **Entrega**: el chat solicita `thumbnail` (no lazy-load; está visible al abrir
  la conversación). La lista usa `srcset` con candidatos limitados a la mayor
  variante WebP, `sizes` correspondiente al masonry actual, `loading="lazy"` y
  `decoding="async"`. El preview de edición usa `thumbnail`.
- **PM nuevo**: se añade PM.19 al backlog para diferenciar optimización de
  perfiles de la futura funcionalidad de imágenes de fondo PM.3/PM.5.

## Criterios de aceptación

- [x] Los originales conservan bytes, extensión, MIME e identificador; export
      continúa exportando el original.
- [x] Upload de perfil, upload de personalización de chat e import generan las
      mismas variantes; GIF no se convierte.
- [x] Variantes con dimensiones correctas, aspect ratio conservado y sin
      upscaling; límites de MIME, bytes y píxeles comprobados.
- [x] Endpoint acepta `variant`, vuelve a una variante menor o al original si
      falta la solicitada, y aplica cache headers distintos para original y
      variantes.
- [x] La card usa `srcset`/`sizes` con anchuras verídicas; el avatar y el preview
      consumen `thumbnail`.
- [x] Backfill idempotente, con `--dry-run`, informe de tamaños y cobertura de
      GIF/error parcial.
- [x] `pnpm check` sin warnings; frontend (173) y backend (334) en verde.
- [x] Build monorepo completado.

## Commits

1. `feat(shared): define responsive character asset variants`
2. `feat(backend): process and store profile image variants`
3. `feat(backend): serve and backfill image variants`
4. `feat(frontend): use responsive profile image variants`
5. `test(images): cover processing, delivery and backfill`
6. `docs(backlog): add PM.19 image optimization`
7. `release: bump to v1.19.0 and add changelog entry`

## Follow-up (v1.20.0)

- **Medición del ahorro**: `assets:backfill-variants -- --report` (solo lectura,
  no escribe nada) informa por asset de los bytes del original y de cada variante
  y de lo que descargarían hoy una card (`medium`) y un avatar (`thumbnail`), con
  porcentajes de ahorro agregados. Es la forma recomendada de comprobar con datos
  reales que un teléfono recibe menos bytes.
- **Límite de subida**: de 3 MB a 15 MB, en la validación del frontend y en el
  default de `MAX_PROFILE_IMAGE_BYTES` del backend. El guard de píxeles
  (`MAX_PROFILE_IMAGE_PIXELS`, 40 MP) sigue protegiendo la decodificación.

Commits:

1. `feat(backend): report delivered image variant sizes`
2. `chore(config): raise the profile image upload limit to 15 MB`
3. `release: bump to v1.20.0 and add changelog entry`

### v1.20.1 — fuente única del límite

- El default del límite (15 MB) y la lista de MIME permitidos viven ahora en
  `@workspace/shared/lib/image` (`DEFAULT_MAX_PROFILE_IMAGE_BYTES`,
  `ALLOWED_IMAGE_MIMES`, `formatMegabytes`). Backend, frontend y textos i18n
  (`{max}`) salen de ahí, así que cambiar el valor es una sola edición.
- El `.env` del backend (`MAX_PROFILE_IMAGE_BYTES`) sigue siendo la autoridad en
  runtime. Trade-off documentado: si se cambia **solo** el `.env`, el pre-check y
  el texto del frontend mantienen el default compartido hasta actualizarlo.
- Los `maxLength` de los formularios (nombre, descripción…) siguen el patrón
  anterior (constantes locales de UX + validación autoritativa del backend); no
  forman parte de este cambio.

Commits:

1. `refactor(shared): single source for image upload limits`
2. `refactor(frontend): consume shared image limits and mime list`
3. `release: bump to v1.20.1 and add changelog entry`
