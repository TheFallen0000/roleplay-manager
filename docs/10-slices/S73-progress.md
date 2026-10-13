# S73 — Rediseño de Proveedores y Personajes jugados (PM.27)

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Cierra el rediseño Ink & Violet con las dos pantallas que quedaban fuera
(PM.27): Proveedores y Personajes jugados. No hay mundo nuevo ni claims nuevos:
el trabajo es aplicar el lenguaje ya construido (tipografías, placas, tarjetas
de papel con filos, mascota en los estados) a las dos pantallas, sin tocar la
funcionalidad. Es además el **primer slice bajo el flujo de releases agrupadas**
(ver «Sistema»).

## Decisiones

### Auditoría previa (capturas antes/después)

El «antes» confirmó el diagnóstico: cabeceras en la sans del sistema, estado
vacío con icono genérico (en vez de la mascota), tarjeta de proveedor con una
**card anidada** para las instancias y botones sin jerarquía.

### Personajes jugados

- Cabecera con la display (Zen Maru black) y lede, como la biblioteca.
- **Placas de persona** (`player-character-card.tsx`): monograma en Dela Gothic
  sobre papel atenuado (la regla del sistema para personajes sin imagen),
  nombre y descripción; acciones en el pie de hairline con fondo `muted/50`, en
  ghost y con el borrado virando a destructivo al hover. La tarjeta no es
  clicable, así que **no hay elevación al hover** (sin falsa afordancia).
- Estado vacío con `MascotPose` y copy partida en título/descripción («Tu
  elenco está vacío») más CTA, replicando el estado vacío de la biblioteca.

### Proveedores

- Cabecera «Proveedores» (la clave `defaultTitle` pasa a `heading`) con
  `defaultDescription` como lede; el «Proveedor actual» pasa de píldora a
  **placa** con nombre en Zen Maru y modelo en mono.
- Tarjeta de proveedor: placa de icono en violeta suave (Cpu local / Plug
  remoto), **chip de estado con punto** (esmeralda disponible, destructivo
  caído, tinta el resto) en lugar de la insignia de color, y secciones separadas
  por hairlines.
- **Instancias como filas** dentro de un único borde (fin de la card anidada):
  fila seleccionada en violeta suave con `aria-pressed`, URL en mono, acciones
  ghost; «Nueva instancia» en botón discontinuo (invita a actuar).
- Las acciones (Probar / Establecer predeterminado / Establecer modelo) se
  agrupan en una sola fila; con `mode="local"` (diálogo de Modelo del chat)
  queda solo «Probar conexión», como antes.

### Sistema

- Sin vocabulario nuevo: todo reutiliza patrones de `DESIGN.md` (placas, chips,
  monogramas, filos, mascota), así que **no se toca `DESIGN.md`**.
- Detector de `impeccable` sobre los cinco archivos: sin hallazgos.
- **Release**: las entradas van a `[Unreleased]` y `AGENTS.md` §9 documenta el
  flujo nuevo (bump agrupado a demanda en un PR `chore(release)`), acordado con
  el usuario.

## Criterios de aceptación

- [x] Ambas pantallas con cabecera display + lede y el lenguaje de la app.
- [x] Jugados: placas con monograma, acciones calladas y vacío con mascota.
- [x] Proveedores: placa de configuración actual, tarjetas con placa/chip/filos
      y lista de instancias sin anidar.
- [x] Sin cambios de comportamiento: 302 tests del frontend en verde (los del
      manager de jugados, actualizados a la copy nueva).
- [x] `pnpm check` 7/7, suites y capturas (claro/oscuro/móvil) revisadas.
- [x] Flujo de release nuevo documentado y CHANGELOG en `[Unreleased]`.

## Verificación

- `pnpm check` 7/7; backend **505** y frontend **302** tests.
- Verificación visual con backend aislado y dev server en puertos propios
  (3301/4399, datos en un temporal): capturas antes/después en claro, oscuro y
  móvil (390×844) de ambas pantallas, con una instancia y dos personas
  sembradas; revisadas una a una.
- Detector `impeccable`: sin hallazgos.

## Commits

1. `feat(frontend): redesign the providers and player characters screens`
2. `docs(workflow): batch releases through [Unreleased]`
3. `docs(slice): add S73 progress and mark PM.27`
