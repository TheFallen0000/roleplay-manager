# S67 — Encabezado de edición de personaje en móvil

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

En pantallas estrechas (~320px) el encabezado de «Editar personaje» era una fila
`flex items-center justify-between` sin wrap: el título se partía en dos líneas y
los botones «Eliminar» y «Guardar cambios» se salían del contenedor y del
viewport (desborde horizontal medido de 179px).

## Decisión

- **Apilar en móvil, fila en ≥sm**: el `header` pasa a
  `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`, y el
  bloque de acciones gana `flex-wrap` para envolver etiquetas largas
  («Iniciar conversación», «Guardar cambios») en varias líneas sin desbordar.
  En escritorio el layout queda igual que antes.
- Sin cambios de copy ni de comportamiento: solo el layout del encabezado.

## Criterios de aceptación

- [x] A 320px no hay desborde horizontal y todos los botones quedan dentro del
      encabezado.
- [x] El título se muestra en una sola línea.
- [x] A ≥640px el layout de escritorio no cambia.
- [x] Gates + tests + smoke en verde; PR con CI verde y release v1.40.5.

## Verificación

Medición real con Playwright sobre el **paquete empaquetado**, viewport 320×640,
sesión con un personaje de prueba:

| Métrica | Antes (v1.40.3) | Después (fix) |
|---|---|---|
| `docScrollWidth` vs `innerWidth` | 499 vs 320 (**desborde 179px**) | 320 vs 320 ✓ |
| Botones fuera del header | «Eliminar» y «Guardar cambios» | ninguno ✓ |
| `h1` | dos líneas (height 64) | una línea (height 32) ✓ |

- Los botones quedan dentro de la tarjeta y envuelven en dos filas.
- Capturas `before.png` / `after.png` revisadas visualmente.

## Commits

1. `fix(frontend): stack the character edit header on small screens`
2. `docs(slice): add S67 progress`
3. `release: bump to v1.40.5 and add changelog entry`
