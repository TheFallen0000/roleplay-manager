# S112 — Revisión de prompts: rol explícito e idioma

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Revisión de los prompts que se envían al modelo para interpretar al personaje,
generar resúmenes y crear títulos. El objetivo era doble:

- **Explicitar el contrato narrativo**: hoy el prompt empieza con «You are
  {name}» y no dice que sea un roleplay, ni prohíbe escribir al personaje del
  usuario, ni fija el idioma de respuesta.
- **Cerrar la deuda de idioma**: el prompt del personaje ya seguía la interfaz
  desde S26, pero el resumen estaba fijado en español y el título en inglés.

### Prompt del personaje

Se añade un bloque `## Juego de rol` justo después de la identidad, con seis
reglas: ficción privada, permanencia en el personaje, agencia del usuario,
temas maduros sin avisos no solicitados, idioma espejo y ritmo de 2-4 párrafos.

### Resumen y título

Sus plantillas pasan a `summaryPrompt.*` y `titlePrompt.*` en los diccionarios
EN/ES. `GenerateSummaryUseCase` recibe `locale` desde la ruta manual y desde
los tres flujos automáticos (`send`, `continue`, `regenerate`).

El **resumen** se genera en el idioma de la transcripción, no en el de la
interfaz: así no arrastra al modelo a otro idioma en la siguiente respuesta.
El **título** mantiene la misma regla y usa el idioma de la interfaz solo como
fallback cuando la conversación es demasiado corta para inferirlo.

## Decisiones

- **Marco sin «uncensored»**: se declara ficción privada y se permiten temas
  maduros cuando la escena lo pida, pero no se promete saltarse filtros del
  proveedor. El backend no filtra; ese literal puede provocar rechazos en
  algunos modelos y no aporta nada al contrato narrativo.
- **Agencia del usuario explícita**: «no escribas al personaje del usuario»
  ataca el fallo más habitual del roleplay (el modelo decide las acciones,
  pensamientos o diálogo del jugador). Es una regla, no una sugerencia.
- **Idioma espejo**: responder en el idioma del último mensaje evita que un
  resumen en otro idioma o un cambio puntual de idioma fijen la respuesta.
  Las Instrucciones del personaje siguen teniendo prioridad.
- **Resumen en el idioma de la conversación**: el resumen forma parte del
  system prompt; generarlo en el idioma de la interfaz podía empujar la
  respuesta a ese idioma.
- **Tool schema en inglés**: `propose_memory_changes` es un contrato JSON y
  los modelos lo interpretan mejor así. Se traduce solo el texto que lo rodea.
- **Sin XML de Hermes**: la app usa tool calling nativo y el bloque
  `memory_proposals` como fallback para proveedores sin tools. Añadir el XML
  del ejemplo duplicaría mecanismos y competiría con los existentes.
- **Sin herramientas nuevas**: el ejemplo menciona dados e inventario; la app
  solo tiene propuestas de memoria y este slice no amplía el catálogo.
- **`locale` opcional**: `GenerateSummaryUseCase.execute` mantiene la firma
  retrocompatible (`options` con default `{}`) y usa `en` cuando no llega
  idioma, igual que el builder.
- **Fuera de alcance**: prompts editables por el usuario, idioma por personaje,
  variantes por proveedor y cambios en el formato de salida de S81.

## Criterios de aceptación

- [x] El prompt del personaje incluye ficción, agencia, idioma y ritmo en EN/ES.
- [x] El resumen y el título se construyen desde `summaryPrompt.*` y
      `titlePrompt.*`.
- [x] `GenerateSummaryUseCase` recibe `locale` en la ruta y en los flujos
      automáticos.
- [x] El resumen se genera en el idioma de la conversación.
- [x] El título cae al idioma de la interfaz si la conversación es corta.
- [x] Tests EN/ES del builder, resumen y título.
- [x] `pnpm check`, build y suites en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **652** tests (113 archivos).
- Frontend: **337** tests (57 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Prompt real revisado en ES y EN: el bloque de rol aparece después de la
  identidad y antes de personalidad, tarjetas y memoria.

## Commits

1. `d5f4045 feat(shared): add roleplay, summary and title prompt templates`
2. `73cfa7b feat(backend): localize prompts and add explicit roleplay rules`
3. `docs(slice): document S112 prompt review`
