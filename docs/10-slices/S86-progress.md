# S86 — Títulos: regeneración tras resúmenes e idioma de la conversación

**Estado:** Completado
**Inicio:** 2026-10-26
**Fin:** 2026-10-26

## Descripción

Corrige dos problemas del título automático:

1. **Regeneración tras cada resumen:** la intención original de S8 era regenerar el
   título cuando se genera un resumen. S85 lo interpretó como «solo el primer
   mensaje» y corrigió la nota en la dirección equivocada. Este slice implementa
   el comportamiento previsto: tras un resumen automático (o el generado a mano
   desde el visor), si el título es automático, se vuelve a generar y el frontend
   lo recibe en vivo.
2. **Idioma del título:** el prompt hardcodeaba «en español» y usaba etiquetas
   `[Usuario]`, así que una conversación en inglés recibía un título en español.
   Ahora el título sigue el idioma de la conversación; el idioma de la UI es solo
   un fallback cuando la conversación es demasiado corta para inferirlo.

## Decisiones

- **Todos los resúmenes:** la regeneración se dispara en los tres flujos que
  generan resumen al responder (`send`, `continue`, `regenerate`) y en el botón
  manual «Generar resumen». La ruta manual devuelve `{ summary, title,
  titleSource }` para que el chat actualice el encabezado sin recargar.
- **Título manual intocable:** `GenerateConversationTitleUseCase` devuelve el
  título manual existente si no se pasa `force`. La acción explícita «Regenerar
  automáticamente» pasa `force: true` y sí puede reemplazarlo.
- **Evento `title-generated`:** se emite solo si el título cambió. Evita
  actualizaciones redundantes y permite que el `ChatHeader` se actualice sin
  recargar. El evento `done` sigue llevando el título del primer mensaje.
- **Prompt agnóstico de idioma:** instrucciones en inglés, sin «en español».
  Regla principal: escribir en el mismo idioma que la conversación y no traducir
  nombres. Fallback: inglés o español según el locale de la petición.
- **Contexto:** el prompt incluye nombre, subtítulo y descripción del personaje,
  además del transcript con etiquetas neutras (`User`, nombre del personaje).
- **Limpieza:** se quitan comillas envolventes y puntuación final del título.

## Criterios de aceptación

- [x] Tras un resumen automático, se emite `title-generated` si el título
      automático cambia.
- [x] El botón manual «Generar resumen» regenera el título y el chat lo refleja.
- [x] El título manual no se sobrescribe en el flujo automático.
- [x] «Regenerar automáticamente» sigue funcionando sobre títulos manuales.
- [x] El prompt no contiene «en español» y pide el idioma de la conversación.
- [x] Una conversación en inglés recibe instrucciones y contexto en inglés; el
      locale de la UI solo actúa como fallback.
- [x] Tests de backend, `pnpm check` y build en verde.
- [x] `CHANGELOG.md` con la entrada en `[Unreleased]`.
- [x] PM.44 y PM.45 marcados como hechos en `PM-backlog.md`.

## Verificación

- Backend: **580** tests.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Tests nuevos: prompt de idioma, protección de título manual, evento
  `title-generated` tras resumen en `send-message` y ruta manual de resumen con
  título (éxito, fallo del título y 400 sin mensajes nuevos).

## Fuera de alcance

- Traducir títulos existentes.
- Cambiar el modelo o el proveedor usado para el título.

## Commits

1. `0580630 feat(conversation): regenerate titles after summaries and follow language`
2. `docs(backlog): reopen PM.44 and add PM.45`
3. `6eb355c feat(summary): regenerate the title after a manual summary`
4. `docs(slice): document the manual summary title flow` (this commit)
