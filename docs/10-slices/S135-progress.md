# S135 — Engineering refinement: modern web, nits y skill backend/DB

**Estado:** Draft
**Inicio:** 2026-11-21
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Slice de refinamiento previo a la siguiente release. Adopta Context7 y Modern
Web Guidance, audita el frontend contra APIs y patrones modernos, cierra los
nits seguros acumulados desde S130 y crea una skill interna de revisión de
backend y base de datos. No añade features de producto, no cambia la versión y
no publica release.

## RFC

### Problema

1. **El frontend funciona, pero no se ha auditado contra la plataforma web
   actual.** No hay política de Baseline ni de fallbacks, y patrones como
   `:has`, container queries, `field-sizing`, `content-visibility`,
   `scrollbar-gutter`, `inert`, `prefers-reduced-motion`, `fetchpriority` o
   `AbortSignal.timeout` no se han revisado de forma sistemática. Modern Web
   Guidance no está instalada ni referenciada.

2. **Context7 no está configurado.** Las APIs de React 19, Astro 7, Vite 8,
   Tailwind 4, Base UI, Drizzle 0.31, Express 5, Zod 4 y Vitest 5 se verifican
   a mano contra la documentación. OpenCode ya soporta `mcp.servers`, así que
   la integración es de configuración, no de código.

3. **Quedan nits abiertos desde S130.** Verificado contra el código actual:

   | Origen | Nit | Estado real | Acción S135 |
   | ------ | --- | ----------- | ----------- |
   | S130 | `release.json` commiteado en 1.47.0 | Abierto: `packages/website/src/data/release.json` | Refrescar a 1.58.0. |
   | S130 | «Aplicar detectado» reaplica el mismo valor | Aceptado como UX | Cerrar como aceptado. |
   | S131 | Comparador `workingWindow + maxTokens` (`<=` en el resolver, `>=` en settings) | Abierto: `shared/lib/context-window.ts` y `update-conversation-settings.use-case.ts` | Helper compartido + tests. |
   | S131 | `workingWindow` persistido pero inválido/ignorado | Abierto; el resolver degrada con seguridad | Documentar; normalizar solo si aparece una vía limpia. |
   | S131 | Fallback conservador con salida recortada | Diferido | Mantener diferido. |
   | S131 | Adoptar `workingWindow` en send/continue/regenerate | Feature | Fuera de alcance. |
   | S131 | `conversationOverride` acepta `null` | Abierto en `use-model-capabilities.ts` / `providers.ts` | Estrechar el tipo. |
   | S132 R1 | Entrada de lorebook standalone en el listado | Obsoleto: S134 añadió `/lorebooks` | Cerrar. |
   | S132 R2 | Export ST-native no expuesto | Resuelto: selector en `lorebook-import-dialog.tsx` | Cerrar. |
   | S132 R3 | Fallback de card fijo en inglés | Abierto en `sillytavern-card.mapper.ts` | Pasar el locale de la petición. |
   | S132 R4 | Modal con 3 pestañas | Obsoleto: la UI cambió en S133/S134 | Cerrar. |
   | S132 R5 | Borde de borrado con nombre vacío | Obsoleto: `hasLorebookContent` ya no existe | Cerrar. |
   | S132 R6 | `MAX_CARD_JSON_BYTES` sin uso | Abierto: solo test | Eliminar. |
   | S132 R7 | `spec_version` en `unknownFields` | Abierto, round-trip estable | Documentar. |
   | S132 R8 | `reorderEntries` no valida pertenencia | Abierto | Validar ids contra el libro. |
   | S132 R9 | Normalización duplicada frontend/backend | Abierto, mitigado por re-normalización | Diferir. |
   | S133 N1 | N+1 en `GET /characters/:id` | Resuelto en S134 (batch) | Cerrar. |
   | S133 N2 | Entradas de versión sin `id` | Resuelto en S134 (ids sintéticos) | Cerrar. |
   | S133 N3 | `extensions.rm` emite `null` | Abierto | Omitir claves nulas. |
   | S133 N4 | Paginación en memoria en `list-lorebooks` | Resuelto en S134 (SQL) | Cerrar. |
   | S133 N5 | Canonicalización en `shared/lib` | Benigno | Nota. |
   | S133 UI N1 | `<details open>` sin `onToggle` | Abierto, cosmético | Documentar. |
   | S133 UI N4 | Grano/topbar globales | Intencional (shell) | Cerrar. |
   | S133 UI N5 | `KeyListInput` no resincroniza | Abierto | Resincronizar preservando el texto en curso. |
   | S134 NIT 3 | Tipo de `format` más estrecho | Resuelto (`LorebookImportFormat`) | Cerrar. |
   | S134 NIT 4 | `IMPORT_STALE_MATCH` solo cubre `reuse` + `deleted-identical` | Abierto; sin `previewedKind` no se distingue staleness de error de cliente | Documentar. |
   | S134 NIT 5 | Libros nuevos con `origin_id = null` | Aceptado por diseño | Documentar. |
   | S134 MINOR 1 | `extensions.rm.originId` obsoleto | Resuelto en `import-lorebook-standalone.use-case.ts` | Cerrar. |
   | S134 MINOR 2 | Claves i18n muertas | Resueltas | Cerrar. |

4. **No hay skill de revisión de backend/base de datos.** `check:arch` cubre
   capas y pureza; `query-performance.test.ts` cubre un conjunto fijo de
   consultas; `slice-reviewer` revisa el diff. Falta una checklist reutilizable
   de migraciones, índices, N+1, paginación, transacciones y contratos de error.

5. **El roadmap está desalineado.** `docs/15-card-first-ux-plan.md` reserva S135
   para memoria/retrieval. Si el refinamiento ocupa S135, memoria pasa a S136,
   contexto a S137 y tokenizer a S138.

### Restricciones

- **Sin features de producto ni release.** No se toca la versión, el
  `CHANGELOG` solo recibe `[Unreleased]`, y no se ejecuta `/release`.
- **Sin vendorizar Modern Web Guidance.** El paquete pesa 8,5 MB y la skill
  completa son ~230 archivos / 2 MB. Se usa el CLI bajo demanda
  (`npx -y modern-web-guidance@latest …`) y se documenta la dependencia de red.
- **No reescribir Base UI/shadcn.** Los diálogos, popovers y menús actuales se
  mantienen; la auditoría busca mejoras progresivas, no sustituciones.
- **Sin polyfills nuevos.** Los fallbacks deben ser CSS/JS ligero o degradación
  natural.
- **Arquitectura vigente.** 500 líneas por archivo, aislamiento de features,
  `shared/` puro, dependencias hexagonales y `check:arch` en verde.
- **Context7 es de solo lectura.** No se guardan credenciales en el repo; la API
  key es opcional y se documenta como variable de entorno.
- **Los fixes de nits deben ser pequeños y testeados.** R3 y R8 cambian
  comportamiento observable (locale y validación) y necesitan tests de
  regresión; el resto son limpiezas sin contrato nuevo.

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| Un slice S135 con cinco etapas | Un RFC, una review y un PR; contexto único | Slice más grande | Sí |
| Dos o tres slices separados | Más enfocados | Duplica RFC, review y checks | No |
| Solo documentar los nits | Cero riesgo | Deja deuda y no adopta herramientas | No |
| Instalar MWG completa | Funciona offline y auto-trigger | ~230 archivos / 2 MB y actualizaciones manuales | No |
| Wrapper CLI de MWG | Sin vendorizar, siempre actualizado | Requiere red en la primera consulta | Sí |
| Skill backend/DB interna | A medida, sin dependencias, alineada con AGENTS.md | Mantenimiento propio | Sí |
| Skill backend/DB de terceros | Ya escrita | Stack distinto (Drizzle v1 RC, Supabase, SQLAlchemy) | No |

### Decisión

- **Un único slice S135** con etapas de herramientas, auditoría modern web,
  nits, skill backend/DB y docs.
- **Context7** como MCP remoto en `opencode.json`.
- **Modern Web Guidance** como skill wrapper que llama al CLI oficial; no se
  vendoriza el corpus de guías.
- **Skill interna `backend-database-review`** en `.opencode/skills/`, con
  checklist y comandos del repo.
- **Nits seguros + documentación**; las features diferidas siguen fuera.

### Fuera de alcance

- Tokenizer real por proveedor.
- Adoptar `workingWindow` en `send/continue/regenerate`.
- Fuente de catálogo de modelos y override por provider-instance.
- Presets de contexto fast/balanced/deep.
- Reescritura de diálogos/popovers o adopción de View Transitions.
- Vendorizar las guías de MWG.
- PRs de Dependabot #147/#148.
- Bump de versión y release batcheada.

## Plan de eval

No aplica: el slice no toca memoria, contexto, prompts ni comportamiento del
modelo. La auditoría modern web se evalúa con `legacy-scan`, revisión manual y
tests; la skill backend/DB se evalúa con su checklist y
`query-performance.test.ts`.

## Criterios de aceptación

- [ ] Context7 está configurado en `opencode.json` y responde en OpenCode.
- [ ] La skill `modern-web-guidance` está disponible y documentada; `search`,
      `retrieve` y `legacy-scan` funcionan.
- [ ] `docs/10-slices/S135-modern-web-audit.md` recoge los hallazgos, la guía
      aplicada y la decisión (fix/defer/falso positivo) por archivo.
- [ ] R3 (locale), R6 (constante muerta), R8 (pertenencia), S133 N3
      (`rm` nulo), S133 UI N5 (`KeyListInput`), S131 (comparador) y S131 NIT-4
      (tipo) están corregidos con tests.
- [ ] `release.json` refleja 1.58.0 y los assets publicados.
- [ ] La skill `backend-database-review` existe, está referenciada en
      `AGENTS.md` y se ha pasado al backend con un informe de hallazgos.
- [ ] El roadmap está renumerado (S135 refinamiento, S136 memoria, S137
      contexto, S138 tokenizer).
- [ ] `pnpm check`, tests de backend/frontend, `pnpm build` y
      `pnpm audit --prod` pasan.
- [ ] `CHANGELOG.md` tiene las entradas de S135 bajo `[Unreleased]`, en inglés.
- [ ] No hay cambios de versión ni release.

## Red tests

Los tests se escriben antes de la implementación. Matriz inicial:

| Fix | Test rojo esperado |
| --- | ------------------ |
| R3 locale | Importar una card sin `description`/`first_mes` con `Accept-Language: es` persiste el fallback en español; con `en` sigue en inglés. |
| R6 constante | La constante desaparece; el test que asertaba su valor se elimina y el límite real (`maxDecodedCardJsonBytes`) sigue cubierto. |
| R8 pertenencia | Reordenar con un `entryId` de otro libro devuelve 400/409 y no muta ninguna fila; un orden válido sigue funcionando. |
| S133 N3 | Exportar una card sin `subtitle`/`instructions` no incluye `extensions.rm.subtitle` ni `extensions.rm.instructions`. |
| S133 UI N5 | Re-renderizar `KeyListInput` con otro `value` actualiza el texto; escribir una coma final no se normaliza hasta el blur. |
| S131 comparador | `workingWindow + maxTokens === contextWindow` se acepta como neto en el helper y settings no lo borra; por encima se rechaza/degrada. |
| S131 NIT-4 | El tipo de `conversationOverride` no acepta `null`; typecheck falla si se reintroduce. |

## Auditoría modern web

### Alcance

- `packages/frontend/src/components/**` y `packages/frontend/src/pages/**`.
- `packages/website/src/**`.
- CSS de `packages/frontend/src/styles/**` y `packages/website/src/styles/**`.

### Ejes de revisión

| Eje | Qué se comprueba |
| --- | ---------------- |
| HTML/DOM | `<dialog>`, popover, `<details>`, `inert`, `hidden="until-found"`, foco y teclado. |
| CSS layout | Container queries, `:has`, `subgrid`, `text-wrap`, `scrollbar-gutter`, `content-visibility`, `field-sizing`, `@starting-style`, `prefers-reduced-motion`, `color-scheme`, `oklch`. |
| Formularios | `:user-invalid`, `autocomplete`, `inputmode`, `enterkeyhint`, `field-sizing`, validación tras interacción, IME seguro. |
| Rendimiento | `fetchpriority`, `loading=lazy`, `srcset/sizes`, `AbortSignal.timeout/any`, `scheduler.yield`, `content-visibility`, chunks de `i18n-provider` y `chat`. |
| Accesibilidad | `aria-live`, `aria-invalid`, `inert`, foco al abrir/cerrar, labels, contraste, movimiento reducido. |
| React 19/Astro 7 | `ref` como prop, `use`/`useOptimistic`/`useActionState` donde aporten, `client:visible`/`client:idle`, islas y carga de imágenes. |

### Regla de decisión

- **Fix** si es progresivo, no cambia la UX, tiene test o verificación visual y
  no añade dependencias.
- **Defer** si requiere un cambio de UX, un rediseño o una decisión de producto.
- **Falso positivo** si el patrón actual es deliberado (Base UI, fallback
  existente, código vendorizado).

## Skill backend/DB

### Skill evaluadas

| Skill | Cobertura | Motivo para no adoptarla |
| ----- | --------- | ------------------------ |
| Drizzle `drizzle` (oficial) | Esquema, queries, migraciones | Requiere `drizzle-kit` v1 RC; el repo usa 0.31.11, sin comando `skills`. |
| Supabase `agent-skills` | Postgres, RLS, edge functions | Postgres/Supabase, no SQLite + Drizzle. |
| `backend-performance-review` (Sanoy24) | Rendimiento con evidencia, Node/Express/SQLite deep | Solo rendimiento; añade scripts Python y artefactos. Se puede reconsiderar más adelante. |
| `hexagonal-typescript` (Remy349) | Hexagonal + DDD en TS | Impone su propia estructura y compite con AGENTS.md. |
| `nodejs-backend-patterns`, `node` (mcollina) | Patrones generales de Node/Express | Genéricos; no cubren Drizzle/SQLite ni las capas del repo. |
| `backend-code-review` (Dify) | Arquitectura + esquema + repositorios | Atado a SQLAlchemy y convenciones de Dify. |

### Contenido de la skill interna

- Capas hexagonales y dirección de dependencias.
- Puertos, repositorios Drizzle y composición en el container.
- Migraciones: `generate` vs `push`, snapshots, conflictos, pérdida de datos,
  `drizzle-kit check`.
- SQLite: WAL, `foreign_keys`, `busy_timeout`, transacciones, `RETURNING`,
  `json_extract`, límites de SQLite.
- Consultas: N+1, `EXPLAIN QUERY PLAN`, índices, `EXISTS`, batch `IN`,
  paginación SQL, `COUNT(DISTINCT)`.
- API: Zod, `DomainError`, códigos HTTP, errores JSON, límites de body.
- Tests: use cases con mocks, repositorios con SQLite temporal,
  `query-performance.test.ts`.

## Decisiones

Se completará durante la implementación. Decisiones ya tomadas en el RFC:

- **Context7 sin API key por defecto.** El servidor remoto funciona con el
  límite gratuito; la clave se documenta como opcional.
- **MWG sin vendorizar.** Se prioriza el tamaño del repo y la actualización
  continua sobre el funcionamiento offline.
- **Skill interna en `.opencode/skills/`.** Las skills de terceros viven en
  `.agents/skills/`; la interna sigue el patrón de `release-workflow` y
  `slice-workflow`.
- **R3 usa `Accept-Language`.** El cliente ya lo envía en `apiRequest`; no hace
  falta un campo nuevo en el contrato.
- **R8 valida pertenencia, no exige permutación completa.** El endpoint sigue
  admitiendo reórdenes parciales, pero rechaza ids ajenos y duplicados.

## Verificación

Pendiente.

## Review

- **Estado:** pendiente
- **Informe:** `docs/10-slices/S135-review.md`

## Deferred

- R7 (`spec_version` en `unknownFields`): documentar, sin cambio.
- R9 (normalización duplicada): diferido; mitigado por la re-normalización del
  backend.
- S134 NIT 4 (`IMPORT_STALE_MATCH`): documentado; ampliarlo requiere llevar el
  `previewedKind` al confirm.
- S134 NIT 5 (`origin_id` nulo): aceptado por diseño.
- S131 `workingWindow` persistido pero inválido: documentado; el resolver
  degrada con seguridad.
- S131 fallback conservador con salida recortada: diferido.
- S133 UI N1 (`<details open>`): cosmético; se revisa si la auditoría modern
  web encuentra una solución limpia.
- S133 N5 (canonicalización en `shared/lib`): benigno.
- Features: tokenizer, `workingWindow` en send/continue/regenerate, catálogo y
  override por instancia.
- Dependabot #147/#148.

## Commits

1. `docs(slice): add S135 RFC`
2. `chore(tooling): add Context7 MCP and Modern Web Guidance skill`
3. `test(backend): cover S135 locale, reorder and rm export fixes`
4. `test(frontend): cover S135 key list resync and working window helper`
5. `fix(backend): localize card fallbacks and validate lorebook reorder`
6. `fix(backend): omit null rm fields and unify working window guard`
7. `fix(frontend): resync key list input and narrow capability override`
8. `chore(website): refresh release snapshot and translate script messages`
9. `docs(skill): add backend-database-review`
10. `docs(slice): record S135 modern web and backend audits`
11. `docs(roadmap): renumber slices after S135`
12. `docs(changelog): add S135 entries`
