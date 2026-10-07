# S51 — Aislar features: store de proveedores + UI compartida + check

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

El chat importaba piezas de la feature de proveedores y **duplicaba ~150 líneas**
de su lógica (verificar conexión, listar modelos, crear/editar/borrar instancias).
Al añadir el check de aislamiento aparecieron **7 imports cruzados más** (rutas
relativas que no se veían a simple vista): el chat también componía UI de memoria,
resumen y personaje. Se decide una regla explícita, se reorganiza el código para
cumplirla y se verifica.

## Decisiones

- **Lógica compartida → store**: `lib/stores/provider.store.ts` (zustand, la
  convención del repo: un store por recurso, llamando a `lib/api/`). Guarda
  proveedores registrados, instancias, y el estado de verificación/modelos por
  proveedor o instancia, con acciones `load`/`createInstance`/`updateInstance`/
  `deleteInstance`/`verifyOllama`/`verifyInstance`. Las acciones de verificación
  **devuelven el resultado** (sin toasts) para que cada pantalla decida su UI.
  Beneficio extra: las dos pantallas quedan **sincronizadas**.
- **UI compartida → `components/shared/`**: el clúster de proveedores
  (`provider-card`, `model-combobox`, `instance-list`, `instance-form-dialog`,
  `use-instance-dialog`) a `components/shared/provider/`, y las piezas de imagen
  (`image-cropper-dialog`, `image-cropper.utils`, `profile-image-input`) a
  `components/shared/images/`.
- **Paneles que solo usa el chat → junto al chat**: `memory-*`, `proposal-list` y
  `summary-viewer` pasan a `components/conversation/` (son UI de la conversación;
  las carpetas `memory/` y `summary/` desaparecen).
- **Formateo de errores**: `lib/format-api-error.ts` (estaba duplicado en las dos
  pantallas).
- **Regla + 7º check**: una feature solo puede importar de su carpeta,
  `components/shared/**`, `components/layout/**` y `lib/`. `layout/` (el shell)
  puede componer features.

## Criterios de aceptación

- [x] Ambas pantallas comparten el store (sin lógica duplicada).
- [x] No queda ningún import entre features (`check:arch` 7/7).
- [x] El check nuevo detecta violaciones (validado con el estado previo: encontró
      los 7 imports cruzados restantes).
- [x] `AGENTS.md` documenta la regla y los 7 checks.
- [x] Gates: `pnpm check`, tests de backend y frontend, `pnpm build` en verde.

## Verificación

- `pnpm check:arch` → **7/7**. El check de aislamiento se validó en el proceso:
  con el código anterior falló señalando exactamente los imports cruzados.
- Tests: store nuevo (5) y suites existentes (frontend 249, backend 447) en verde;
  `pnpm check` (arch + typecheck + lint) y `pnpm build` correctos.

## Commits

1. `feat(frontend): add a shared provider store`
2. `refactor(frontend): share provider state and move cross-feature UI to shared`
3. `chore(arch): forbid cross-feature imports`
4. `docs(slice): add S51 progress and document feature isolation`
5. `release: bump to v1.32.2 and add changelog entry`
