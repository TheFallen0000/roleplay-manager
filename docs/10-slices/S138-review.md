# S138 — Review (políticas de contexto fast/balanced/deep)

**Estado:** PASS WITH NOTES
**Rama:** `feat/S138-context-policies` · **Base:** `master` (`0676d0a`)
**HEAD:** `54488f7`
**Revisor:** `slice-reviewer` (V4 Pro), revisión independiente

## Resumen

Implementación sólida y completa frente al RFC aprobado y las clarificaciones
#1–#8. `balanced` reproduce exactamente los presupuestos de chat y compactación
previos, con el cap de memoria del resumen como único cambio documentado.
`floor` en `summaryOutput`, `round` en memoria, `80` como default legado y el
target derivado solo con umbral explícito (`!= 80`) están implementados tal
cual. Migración 0023 aditiva con backfill real; export/import/rama/plantilla
propagan la política; tests no tautológicos.

## Resolución de la revisión

- **Menor 1 — consulta semántica del resumen vacía:** resuelto (`7496d4f`).
  `pendingMessage` = última intervención `user` del rango resumido
  (`lastUserMessageContent`). Test de camino híbrido (`885fc83`) captura
  `pendingMessage: "Message 8"` y `budget: 960`.
- **Menor 2 — `mainActors` omitía al PJ:** resuelto (`7496d4f`). Carga el PJ por
  `playerCharacterId` y lo añade. Test léxico incluye una memoria de `Aria`.
- **Menor 3 — `withContextPolicy` sin uso:** resuelto (`7496d4f`).
  `UpdateConversationSettingsUseCase` normaliza con
  `conv.withContextPolicy(...).contextPolicy`, conservando
  `INVALID_CONTEXT_POLICY` y sin tocar el umbral.
- **Nit 4 — test de doble margen engañoso:** resuelto (`885fc83`), eliminado.
- **Nit 5 — eval no distinguía cap de resumen:** resuelto (`885fc83`),
  `budget: plan.summaryMemoryBudget` explícito + aserción.
- **Nit 6 — referencia de la eval no reflejaba las entradas reales:** resuelto
  (`54488f7`); usa el último mensaje `user` de `messages.slice(0, -2)` y
  `mainActors: [harness.character.name]`.

## Bloqueantes / mayores

Ninguno.

## Verificación

La review fue estática. El orquestador ejecutó los gates sobre el HEAD final:

- `pnpm check`: 7/7 arquitectura, typecheck 5/5, lint 5/5.
- Backend: 184 archivos / 1284 tests.
- Eval: 4 archivos / 113 tests.
- Frontend: 97 archivos / 524 tests.
- `git diff --check`: limpio.

## Comprobado

- Shared puro; determinismo; paridad `balanced` contra constantes literales;
  `floor`/`round`; precedencia `workingWindow`/`maxTokens`; fallbacks; overflow.
- Migración/backfill; entidad/repositorio/DTO/export/import/rama/plantilla;
  `INVALID_CONTEXT_POLICY`; sin secretos.
- Compactación 70/80/90, 80-legado, 85-explícito, target sin doble margen, net
  mode, 573 en 5735.
- Retrieval S136/S137 intacto; `generate-summary` con selector compartido,
  `summaryMemoryBudget`, PJ en `mainActors` y query = última intervención user.
- Manifiesto/API/UI: desglose leído sin recalcular; i18n en/es; accesibilidad;
  500 líneas y aislamiento respetados.
- Constructor de `GenerateSummaryUseCase` con opcionales explícitos, sin
  overload ni type guards; contenedor y eval actualizados.

## Pendiente de fase (no bloqueante)

- Entrada en `CHANGELOG.md` bajo `[Unreleased]` (inglés, sin bump): la escribe
  `slice-docs` tras el review.

## Commits de la revisión

1. `7496d4f` `fix(backend): align summary retrieval and policy normalization`
2. `885fc83` `test(backend): cover S138 review fixes`
3. `54488f7` `test(backend): align S138 summary eval inputs`
