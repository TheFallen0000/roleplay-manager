# S81 — Salida limpia: reglas de formato + limpieza determinista

**Estado:** Completado
**Inicio:** 2026-10-14
**Fin:** 2026-10-14

## Descripción

Los modelos se colaban en «modo asistente»: títulos y énfasis con `*...*`
(confundidos con acciones), Markdown (`#`, `**negritas**`), listas con
guiones, emojis y líneas en blanco al inicio o al final del mensaje. El
contrato de formato de la app (acciones entre asteriscos, prosa limpia) no
estaba escrito en las reglas y nada lo garantizaba después de la generación:
el texto se guardaba tal cual llegaba (solo se recortaba cuando aparecía un
bloque de propuestas de memoria).

El slice ataca las tres capas: **qué se le pide al modelo**, **qué se limpia
al guardar** y **qué se muestra** (streaming y mensajes antiguos).

## Decisiones

- **Reglas nuevas en el prompt** (`prompt.format*`, es + en): asteriscos solo
  para acciones; sin Markdown (con la excepción del bloque `memory_proposals`);
  sin emojis salvo que las Instrucciones digan lo contrario; empieza y termina
  directo; siempre en personaje. Se colocan tras el ejemplo de estilo para
  reforzarlas al final del system prompt.
- **Limpieza determinista** (`lib/reply-format.ts`): recorte de bordes,
  CRLF→LF, colapso de 3+ saltos, espacios al final de línea, `#` de títulos,
  `**negritas**` y viñetas al inicio de línea (`-`, `+` y `*` solitario). Los
  `*acciones*` (dos o más asteriscos en la línea) se respetan.
- **Emojis con opt-out vía Instrucciones**: se eliminan por defecto
  (pictogramas, banderas, modificadores de tono, ZWJ/selectores) y
  `mentionsEmojis(instructions)` los perdona cuando el personaje los menciona
  («puede usar emojis»). Sin interruptor nuevo: el campo **Instrucciones** es
  el mando, como se acordó.
- **Se aplica a lo generado y a lo escrito**: `send`, `regenerate` y
  `continue` (respuesta), `edit` y el saludo inicial (recorte de espacios en
  el texto del usuario: su contenido no se toca).
- **Streaming limpio**: `createCleanStream` retiene los blancos iniciales
  hasta que empieza el texto; el renderizado (`parseMessage`) recorta bordes
  (esto limpia también los mensajes antiguos ya guardados).
- **Post-limpieza vacío = `EMPTY_RESPONSE`**: una respuesta de solo emojis ya
  no se guarda en blanco; mantiene el comportamiento existente.
- **Fuera de alcance**: detectar `*título*` mal usado (ambiguo — lo cubre el
  prompt), listas numeradas, tablas y cursivas `_` (riesgo de falsos
  positivos; se añadirán si aparecen). Revisado y descartado en el barrido S84.

## Criterios de aceptación

- [x] El prompt incluye la sección de formato (es + en).
- [x] Respuesta con Markdown/viñetas/emojis/blancos → se guarda limpia y las
      `*acciones*` sobreviven.
- [x] Emojis preservados cuando las Instrucciones los mencionan.
- [x] Texto del usuario recortado; saludo inicial recortado.
- [x] Streaming sin blancos iniciales; pintado recorta bordes (legado incluido).
- [x] Suites y gates en verde; CHANGELOG en `[Unreleased]`.

## Verificación

- Lib nueva: 16 tests. `send-message` +2 de integración (limpieza aplicada y
  emojis permitidos). `format-message` +2 (bordes/CRLF y saltos iniciales).
  `memory-proposal-extractor` ajustado y +1 (blancos iniciales del stream).
- Backend **538** tests, frontend **318**, `pnpm check` 7/7.
- **E2E real con proveedor falso** (servidor OpenAI-compatible local que
  responde `"\n\n## Título\n**Hola** 😊\n- uno\n- dos\n\n*Sonríe.*\n\n"`):
  8/8 checks — stream sin blancos iniciales, respuesta guardada
  `"Título\nHola\nuno\ndos\n\n*Sonríe.*"`, mensaje de usuario recortado,
  prompt con la sección de formato y la prohibición de emojis, y emojis
  conservados cuando las Instrucciones los mencionan.

## Commits

1. `feat(shared): add reply format rules to the prompt dictionaries`
2. `feat(backend): apply format rules and normalize generated replies`
3. `test(backend): cover reply cleanup and stream edge trimming`
4. `feat(frontend): trim padded edges when rendering messages`
5. `docs(slice): add S81 progress`
