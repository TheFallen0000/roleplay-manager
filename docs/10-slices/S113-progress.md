# S113 — Propuestas de memoria: criterio, idioma y robustez

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Revisión del prompt de propuestas de memoria y de todo el pipeline que las
convierte en entidades. El prompt anterior decía «si introduces hechos nuevos,
puedes proponer cambios» y nada más: no definía qué era una memoria, no
explicaba cómo evitar duplicados, no fijaba el actor ni el idioma, y el ejemplo
usaba siempre `priority: 5`. Además, el guardado tenía tres fallos que podían
perder propuestas o dejar bloques visibles.

### Prompt

El bloque `## Propuestas de memoria` ahora incluye:

- **Qué es una memoria**: un hecho duradero (relaciones, secretos, promesas,
  deudas, heridas, objetos importantes, lugares, objetivos o cambios de estado),
  no cada acción, emoción o línea de diálogo.
- **Cuándo proponer**: solo cuando el turno establece o modifica uno de esos
  hechos; si no pasa nada relevante, no se propone nada.
- **CREATE/UPDATE/DELETE**: UPDATE para corregir o ampliar y DELETE solo cuando
  la historia lo deshaga o lo rectifique.
- **Deduplicación**: revisar la lista y actualizar con el id existente antes de
  crear otra memoria.
- **Actor**: el nombre exacto del personaje, entidad o lugar; el nombre del
  personaje del usuario para los hechos que le conciernen.
- **Forma**: título de 3-8 palabras y descripción de una o dos frases.
- **Prioridad**: 1-3 detalle menor, 4-6 hecho relevante, 7-9 cambio importante,
  10 hecho definitorio. El 5 del ejemplo es un marcador, no el valor por defecto.
- **Idioma**: actor, título y descripción en el idioma de la conversación.
- **Herramienta vs bloque**: preferir la herramienta; el bloque es solo el
  fallback y nunca se usan ambos.

### Robustez

- **El bloque se limpia siempre**: antes, si había tool calls, se guardaba el
  contenido completo y el bloque aparecía al recargar el mensaje.
- **Fallback real**: si hay tool calls pero no producen propuestas válidas, se
  usa el bloque delimitado.
- **Normalización compartida** (`lib/normalize-proposals.ts`): CREATE exige
  actor y título; UPDATE y DELETE se hidratan desde la memoria objetivo; la
  prioridad se limita a 1-10; las propuestas inválidas se descartan de una en
  una sin abortar el lote.
- **UPDATE parcial seguro**: los campos omitidos conservan el valor actual en
  vez de sobrescribirse con `""` o `5`.
- **DELETE ligero**: el schema ya no exige actor, título y descripción; con
  `operation` y `targetMemoryId` basta y el resto se toma de la memoria.
- **Ids desconocidos**: UPDATE y DELETE con un `targetMemoryId` inexistente se
  descartan antes de guardarse.
- **Tres flujos alineados**: `send`, `continue` y `regenerate` usan la misma
  normalización, en vez de repetir la lógica.

## Decisiones

- **Hechos duraderos**: el criterio evita que el modelo proponga cada emoción o
  acción y mantiene la memoria útil para la coherencia a largo plazo.
- **Idioma de la conversación**: igual que el resumen; el prompt y el panel
  pueden estar en otro idioma, pero la memoria se inyecta en la historia.
- **Prioridad narrativa**: con el decaimiento actual, todo en 5 hace que todas
  las memorias duren lo mismo; la escala da al modelo una razón para distinguir.
- **Hidratar en vez de exigir**: pedir al modelo que repita los campos de una
  memoria para un DELETE es frágil y propenso a inventar. El servidor tiene la
  memoria delante y puede completar los campos.
- **Schema permisivo**: solo `operation` es requerido; la obligatoriedad real
  depende de la operación y se valida en el normalizador. Así un DELETE o un
  UPDATE parcial no se pierden por un schema demasiado estricto.
- **Bloque siempre limpio**: aunque el modelo use la herramienta, el bloque de
  fallback se elimina del contenido guardado.
- **Fuera de alcance**: mostrar la memoria objetivo en la UI, confirmar DELETE
  al aceptar todo, leyenda de prioridad y modo auto explicado. Van en un slice
  de UX posterior.
- **Fuera de alcance**: traducir el schema de la herramienta; sigue en inglés
  como contrato JSON.
- **Fuera de alcance**: respuesta solo-tool sin narrativa. Hoy devuelve
  `EMPTY_RESPONSE` y las propuestas no se guardan; se documenta como caso
  límite.

## Criterios de aceptación

- [x] El prompt define memoria, momento, operaciones, dedup, actor, forma,
      prioridad, idioma y herramienta vs bloque.
- [x] El schema solo exige `operation` y documenta la obligatoriedad por
      operación.
- [x] UPDATE/DELETE se hidratan desde la memoria objetivo.
- [x] La prioridad se limita a 1-10 y las propuestas inválidas no abortan el
      lote.
- [x] El bloque se elimina del contenido aunque haya tool calls.
- [x] El bloque se usa como fallback si el tool call no produce propuestas.
- [x] Tests del normalizador, del schema, del builder y de los dos escenarios
      de tool call + bloque.
- [x] `pnpm check`, build y suites en verde.
- [x] CHANGELOG en `[Unreleased]` y doc de caso de uso corregido.

## Verificación

- Backend: **664** tests (114 archivos).
- Frontend: **337** tests (57 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Prompt real revisado en ES y EN con `enableMemoryProposalTool` activado.

## Commits

1. `264fe8a feat(shared): rewrite the memory proposal prompt`
2. `480b000 feat(backend): normalize and harden memory proposals`
3. `docs(slice): document S113 memory proposals`
