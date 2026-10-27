# S92 — Zod 4, OpenAI 7 y Vitest 5

**Estado:** Completado (v1.51.2)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Actualización conjunta de las tres dependencias mayores que quedaban del audit:

- `zod` 3.25.76 → **4.6.7**
- `openai` 4.104.0 → **7.44.0**
- `vitest` 2.1.9 → **5.0.5** (backend y frontend)
- `vite` **8.3.5** declarado como devDependency explícita

El objetivo es cerrar la vulnerabilidad de Zod, alinear el SDK con Node 24 y
dejar el runner de tests en la versión actual sin cambiar la API ni la UI.

## Decisiones

- **Zod 4 sin migración de datos:** los esquemas son simples y no usan
  `errorMap`, `nativeEnum`, `z.record` de un solo argumento, `.merge()` ni
  `.deepPartial()`. Los cambios de código se limitan a reemplazar
  `.passthrough()` por `z.looseObject()` y `z.string().url()` por `z.url()`.
- **Mensajes de validación:** Zod 4 cambia algunos textos de error. La API sigue
  devolviendo `VALIDATION_ERROR` y los tests comprueban el código, no la
  redacción exacta.
- **OpenAI 7 mantiene Chat Completions:** el adaptador debe funcionar con
  LM Studio, vLLM y cualquier endpoint compatible, no solo con OpenAI. Chat
  Completions sigue soportado y evita migrar a Responses API.
- **OpenAI `~7.44.0`:** se evita 7.45.1, publicado el mismo día, para respetar
  la política de antigüedad mínima de releases de pnpm. No se añade una
  exclusión a `minimumReleaseAgeExclude`.
- **Vitest 5 usa Vite 8:** Vite ya no es dependencia directa de Vitest, así que
  se declara explícitamente en backend y frontend. El alias del config de
  frontend pasa de `__dirname` a `import.meta.dirname`.
- **Mock tipado:** `vi.fn()` cambió su inferencia en Vitest 5; el mock de
  `updateDimensions` se tipa explícitamente como `Mock<(...) => Promise<void>>`.
- **Sin cambio de comportamiento de tests:** `clearMocks` pasa a `true` por
  defecto, pero los tests no dependían de historial entre casos; no se añade una
  excepción de configuración.
- **Fuera de alcance:** migrar a Responses API, cambiar el pool de Vitest
  (`vmThreads`/`isolate: false`), añadir `@vitest/coverage-v8` y paginación
  (S93).

## Criterios de aceptación

- [x] Zod actualizado a 4.6.7 y esquemas modernizados.
- [x] OpenAI actualizado a 7.44.0 sin cambiar el adaptador ni el contrato.
- [x] Vitest 5.0.5 en backend y frontend, con Vite 8 explícito.
- [x] Backend: 606 tests en verde.
- [x] Frontend: 329 tests en verde.
- [x] `pnpm check` y `pnpm build` en verde.
- [x] Paquete portátil generado y smoke test completo en verde.
- [x] `pnpm audit --prod` sin críticas y sin la vulnerabilidad de Zod.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **606** tests (104 archivos).
- Frontend: **329** tests (54 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux generado con el código de S92 y smoke test completo.
- `pnpm audit --prod`: **0 críticas**, 4 altas (Undici y `source-map-js` en el
  árbol de build de Astro; fuera del alcance de S92).

## Commits

1. `5d13f67 chore(deps): upgrade Zod to v4`
2. `abf48f2 chore(deps): upgrade OpenAI SDK to v7`
3. `9b75ed3 chore(deps): upgrade Vitest to v5`
4. `docs(slice): add S92 progress and dependency notes` (this commit)
