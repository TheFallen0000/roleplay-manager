# S75 — Acciones de la persona en un menú «Opciones»

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Corrige el desborde del pie de la placa de persona: con el idioma en español,
Editar/Exportar/Eliminar no caben en tarjetas de tres columnas (~15,5 rem). Las
tres acciones pasan a un **DropdownMenu** disparado por un único botón
«Opciones».

## Decisiones

- **DropdownMenu, no Popover** (propuesta del usuario, componente ajustado):
  para listas de acciones el componente correcto es el menú (rol `menu`,
  navegación por teclado, ítem destructivo) y es el que ya usan el engranaje del
  chat, el menú del mensaje y el menú contextual de personajes. El Popover queda
  para contenido enriquecido.
- **Un solo botón** en el pie («⋯ Opciones», ghost) y ancho mínimo del contenido
  (`min-w-44`) para que «Exportar» y «Eliminar» no se corten.
- El borrado usa la variante destructiva del menú, detrás de un separador.
- Sin cambios de comportamiento: los mismos handlers (editar/exportar/eliminar).

## Criterios de aceptación

- [x] El pie de la tarjeta ya no desborda en español ni en inglés (3 columnas y
      móvil).
- [x] Las tres acciones siguen accesibles y funcionan (descarga real y diálogo
      de borrado verificados).
- [x] Tests actualizados (abrir el menú antes de cada acción) y gates en verde.
- [x] CHANGELOG en `[Unreleased]` (`Fixed`).

## Verificación

- `pnpm check` 7/7 y frontend **315** tests en verde.
- E2E con el paquete: un disparador «Opciones» por tarjeta; el menú muestra
  Editar/Exportar/Eliminar; exportar desde el menú descarga
  `persona-auron-2026-10-13.json`; eliminar abre el diálogo de confirmación;
  todo repetido en inglés («Options» → Edit/Export/Delete) y en móvil.
  Capturas revisadas a 1440 px (3 columnas), menú abierto y móvil.
- Detector de `impeccable` sin hallazgos.

## Commits

1. `fix(frontend): move the persona actions into an Options menu`
2. `docs(slice): add S75 progress`
