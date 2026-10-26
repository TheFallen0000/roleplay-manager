# S76 — Parser de propuestas de memoria tolerante (PM.31)

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

El bloque ` ```memory_proposals ` era frágil: exigía la etiqueta exacta
(minúsculas, guión bajo) **y** su cierre, así que los modelos que se desvían
—sobre todo los locales, que no tienen tool calling— perdían propuestas y
dejaban el JSON crudo dentro del mensaje guardado. Ahora la detección es
tolerante y las reparaciones seguras recuperan los formatos rotos más comunes.

## Decisiones

- **Matcher tolerante y global**: insensible a mayúsculas, acepta `_`, `-` o
  espacio como separador y cubre **todos** los bloques del mensaje (antes solo
  el primero); un bloque **sin cerrar** cuenta hasta el final y se recupera
  (respuestas cortadas a mitad, típico al agotar tokens).
- **Reparaciones seguras** del JSON (alcance elegido por el usuario): comas
  finales, prosa alrededor (se toma el primer `[`…último `]`), envoltorio en
  objeto (`{"proposals": […]}`) y normalización (operación a mayúsculas y sin
  espacios, `priority` en string a número, `trim` en los textos). **Sin tocar
  comillas simples**: los apóstrofes del texto las hacen ambiguas y podrían
  corromper contenido válido.
- **Streaming**: el limpiador usa el mismo matcher (etiqueta tolerante, varios
  bloques y sin cierre siguen ocultos en vivo).
- **Traza**: si había bloque y no se pudo leer ninguna propuesta, `logger.warn`
  con una muestra de 500 caracteres (sin avisos en la UI, para no meter ruido).
- Fuera de alcance: comillas simples y notificaciones al usuario (revisado y
  descartado en el barrido S84).

## Criterios de aceptación

- [x] Etiqueta con mayúsculas/separadores detectada y limpiada.
- [x] Bloque sin cerrar recuperado y limpiado.
- [x] Comas finales, prosa y envoltorio parseados.
- [x] Operaciones y prioridad normalizadas.
- [x] Varios bloques limpiados y extraídos.
- [x] El streaming oculta mayúsculas y varios bloques.
- [x] `logger.warn` con muestra cuando no se puede leer un bloque.
- [x] Gates y suites en verde; CHANGELOG en `[Unreleased]`; PM.31 marcada.

## Verificación

- Backend **512** tests (+7) y frontend **315**; `pnpm check` 7/7.
- Batería nueva sobre formatos rotos (mayúsculas, guiones, sin cierre, coma
  final, prosa, envoltorio, operación en minúsculas, `priority` string y varios
  bloques) en extractor y streaming; los tests existentes siguen intactos.
- Sin verificación en navegador: es una librería pura del backend (sin UI); el
  wiring con el flujo de mensajes lo cubren los tests del use case.

## Commits

1. `fix(backend): make the memory proposal parser tolerant to drifted formats`
2. `docs(slice): add S76 progress and mark PM.31`
