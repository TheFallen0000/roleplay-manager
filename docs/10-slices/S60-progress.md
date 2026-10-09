# S60 — Shell y biblioteca

**Estado:** Completado
**Inicio:** 2026-10-09
**Fin:** 2026-10-09

## Descripción

Segundo slice del rediseño (`docs/redesign-plan.md`): la pantalla de personajes
pasa a ser el estante de historias y el shell adopta el mundo de S59. La
biblioteca gana cabecera tipográfica, toolbar con contador en vivo, tarjetas
16:10 con elevación al pasar el ratón, tarjeta «Crear personaje»
punteada, placeholder de inicial cuando no hay imagen y un estado vacío con la
mascota. El sidebar marca la sección activa y el header se vuelve sticky con un
blur sutil.

## Decisiones

- **Biblioteca como portada**: título con la display, lede («Cada personaje
  guarda sus versiones, su memoria y sus conversaciones») y contador en un
  badge de la toolbar (resultados al buscar, total al no buscar).
- **Tarjetas**: portada 16:10, nombre con Zen Maru, insignia de versión en
  violeta suave, subtítulo y fechas; elevación y borde violeta al hover.
  Cuando no hay imagen, una inicial grande en Dela Gothic sobre el fondo
  atenuado (placeholder honesto, no icono genérico).
- **`MascotPose`** (nuevo componente de marca): dibuja la pose pedida y cae al
  arte existente si no está; las poses adicionales siguen **diferidas**
  (plan §7.1). El estado vacío usa `hello` → hoy renderiza la mascota actual.
- **Shell**: el nombre del producto usa la display (Zen Maru black), la
  sección activa se resalta en el sidebar con `isActive` (el `pathname` llega
  por SSR desde `base.astro`, sin efectos ni parpadeos de hidratación) y el
  header es sticky (`bg-background/80` + blur). **Alturas y padding intactos**
  para no alterar los cálculos de altura del chat (S61).
- **Alcance**: Proveedores y Personajes jugados no se rediseñan aquí; heredan
  los tokens nuevos. El chat queda para S61 y el pulido fino para S62.
- **Fix de paso**: `update-notice` renderizaba un `<a>` mediante `Button` sin
  `nativeButton={false}` (error de consola de Base UI); corregido.

## Criterios de aceptación

- [x] Biblioteca rediseñada: cabecera, toolbar, grid de tarjetas, tarjeta-add
      y estado vacío con mascota.
- [x] `MascotPose` con fallback seguro a la pose neutral.
- [x] Sidebar con sección activa y marca tipográfica; header sticky.
- [x] Copys i18n nuevos en es/en (`characters.lede`, estado vacío ampliado).
- [x] Sin cambios de comportamiento: los 259 tests del frontend siguen verdes.
- [x] Verificación visual con capturas reales (claro, oscuro, móvil y otra
      sección) y consola del navegador limpia.

## Verificación

- `pnpm check` 4/4 y `pnpm --filter @workspace/frontend exec vitest run`:
  42 archivos, 259 tests ✓.
- Capturas con Chrome headless (puppeteer-core sobre el Chrome ya cacheado por
  Puppeteer) contra un **backend aislado**: `DATABASE_PATH` + `DATA_DIR` en
  un temporal y `TURBO_ENV_MODE=loose` (turbo filtra el entorno en modo
  estricto). Datos sintéticos sembrados por API; la base temporal se borró al
  terminar.
- Consola limpia en `/`, `/settings/providers` y `/player-characters` tras el
  arreglo de Base UI.
- Detector de `impeccable` sobre los componentes modificados: sin hallazgos.

## Commits

1. `feat(frontend): redesign the app shell and the character library`
2. `fix(frontend): give the update notice its native-button flag`
3. `docs(slice): add S60 progress`
4. `release: bump to v1.38.0 and add changelog entry`
