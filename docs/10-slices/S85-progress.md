# S85 — Calidad: tests de memoria + accesibilidad y estados

**Estado:** Completado
**Inicio:** 2026-10-26
**Fin:** 2026-10-26

## Descripción

Cierra **PM.34** y **PM.35**, los dos pendientes de calidad promovidos en el
barrido de S84:

- **PM.34 — tests de memoria:** los casos de uso de memoria llegaron a S6 sin
  tests propios y solo `decay` y `delete` se cubrieron después. Faltaban
  `create`, `update`, `list`, `list-proposals`, `apply` y `apply-all`, además de
  las rutas HTTP.
- **PM.35 — accesibilidad y estados:** no había una auditoría formal de teclado,
  foco, nombres accesibles, regiones vivas, contraste o tamaño táctil, y los
  estados de carga/error/vacío no se habían revisado de forma sistemática.

No hay funcionalidad nueva ni rediseño: se añadieron redes de seguridad y se
corrigieron los fallos concretos que aparecieron.

## Decisiones

### Tests de memoria

- **Mocks de puertos, sin DB:** cada caso de uso se prueba con dobles de
  `MemoryRepository` y `MemoryChangeProposalRepository`, siguiendo el patrón de
  `delete-memory.use-case.test.ts`.
- **Casos de uso + rutas:** los tests de caso de uso fijan el contrato
  (CREATE/UPDATE/DELETE, descartes, overrides, targets ausentes y errores); un
  `memory.routes.test.ts` cubre validación, códigos HTTP y delegación.
- **Bug corregido:** `UpdateMemoryUseCase` lanzaba un `Error` genérico cuando la
  memoria no existía y la ruta podía responder 500. Ahora lanza
  `NotFoundError("MEMORY_NOT_FOUND")`, igual que `delete`.

### Accesibilidad y estados

- **Alcance acotado al flujo crítico:** las 9 páginas principales y sus
  diálogos, en claro/oscuro y móvil/escritorio. No se auditó cada componente
  aislado.
- **Playwright + axe fuera del repo:** la auditoría usó el entorno disponible;
  no se añadieron Playwright ni axe a las dependencias. La regresión queda en
  tests concretos de Testing Library.
- **Solo crítico/serio:** se corrigieron violaciones críticas o serias y estados
  rotos; lo cosmético o lo que exigiera rediseño se habría anotado.

### Correcciones concretas

- **Nombres accesibles:** dropzone de imagen (usa su texto visible), combo de
  modelos (trigger y clear), botones de enviar/continuar, flechas de
  alternativas y acciones de edición de mensaje.
- **Contraste:** las acciones del asistente usan `text-muted-foreground` sin
  opacidad; el botón destructivo es sólido en claro y conserva el tono sutil en
  oscuro. Ambos pasan axe en los dos modos.
- **Errores anunciados:** `role="alert"` en chat, logs, actualizaciones, teléfono,
  personaje no encontrado y estados de carga fallida.
- **Estados de carga/error/vacío:** la biblioteca, las personas y los proveedores
  muestran un error explícito con **Reintentar** en vez de un estado vacío
  engañoso; los proveedores tienen spinner de carga inicial.
- **Logs:** la URL de descarga es relativa, así el HTML del servidor y el cliente
  coinciden (se elimina el aviso de hidratación y funciona en acceso remoto).

### Release

- Sin bump de versión: las entradas van a `[Unreleased]` y viajan en la próxima
  release batcheada.

## Criterios de aceptación

- [x] Los 8 casos de uso de memoria tienen test propio.
- [x] Los 8 endpoints de memoria tienen cobertura de ruta (éxito y validación).
- [x] `UpdateMemoryUseCase` devuelve un error 404 coherente si la memoria no
      existe.
- [x] Tests de backend y frontend en verde.
- [x] `pnpm check` en verde (7/7 de arquitectura + typecheck + lint).
- [x] Build de frontend/backend en verde.
- [x] 0 violaciones críticas o serias de axe en las pantallas auditadas.
- [x] Matriz carga/vacío/error/reintento revisada en el flujo crítico.
- [x] Errores anunciados (`role="alert"` o `aria-live`) y botones de envío
      deshabilitados mientras hay una petición en curso.
- [x] `CHANGELOG.md` con la entrada en `[Unreleased]`.
- [x] PM.34 y PM.35 marcados como hechos en `PM-backlog.md`.

## Verificación

- Backend: **577** tests (98 archivos), incluidos 39 nuevos de memoria y rutas.
- Frontend: **321** tests (53 archivos), incluidos los de error/retry y nombres
  accesibles.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Axe (WCAG 2 A/AA): **36 auditorías** (9 páginas × 2 modos × escritorio/móvil),
  **0 violaciones**.
- Estados de error comprobados con respuestas 500 simuladas en biblioteca,
  personas y proveedores: mensaje visible, `role="alert"` y reintento.

## Fuera de alcance

- Rediseño visual, certificación WCAG completa y prueba con lector de pantalla
  real.
- Auth, offline, historial de versiones, Drizzle, iPhone/Safari real
  (PM.36–PM.44).
- Gate permanente de axe en CI: si se quiere, se promueve a otro PM.

## Commits

Prerequisite: `92ce287 docs(backlog): refresh deferred items after S84`.

1. `5e71686 fix(backend): return not found when updating a missing memory`
2. `88697ea test(backend): cover memory use cases and routes`
3. `0c6ac85 fix(frontend): improve accessibility and async states` (includes the
   frontend regression tests)
4. `docs(slice): add S85 progress and changelog` (this commit)
