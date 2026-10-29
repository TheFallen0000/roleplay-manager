# Contrato REST/SSE (v1)

Documento de referencia para consumidores externos del backend: la app web, la
PWA del teléfono y cualquier cliente que quiera generar respuestas (por ejemplo,
un runtime de VTuber). La app no necesita ninguna capa adicional: habla con este
mismo contrato.

## Alcance y estabilidad

- La API vive bajo `/api`, sin prefijo de versión. Este documento describe el
  contrato **v1**.
- Los cambios dentro de v1 son **aditivos**: se pueden añadir campos y eventos,
  pero no se renombran ni se eliminan los existentes. Un cliente debe ignorar
  eventos y campos desconocidos.
- Los eventos y campos actuales se consideran estables a partir de S123.
- No hay autenticación propia. El backend confía en el límite de red: loopback
  por defecto, LAN o Tailscale como opt-in. No expongas el puerto a Internet.

## Dirección y cabeceras

Valor por defecto: `http://127.0.0.1:3001` (`HOST` y `PORT` son configurables).

| Cabecera | Uso |
|---|---|
| `Content-Type: application/json` | Cuerpo JSON en rutas que lo aceptan. |
| `Accept: text/event-stream` | Respuestas SSE de chat. |
| `Accept-Language: es` / `en` | Idioma del prompt y de los avisos generados por el backend. |
| `Origin` | Solo navegadores. Las rutas que cambian estado rechazan peticiones cruzadas; un cliente no-navegador puede omitirla. |

Las rutas que cambian estado (`POST`, `PATCH`, `PUT`, `DELETE`) comprueban
`Origin`/`Sec-Fetch-Site`. CORS no sustituye esa comprobación. No envíes
`Origin` desde un cliente de escritorio si no es necesario.

## Errores REST

Antes de abrir un stream SSE, los errores se devuelven como JSON:

```json
{
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "Conversation with id '...' not found."
  }
}
```

Códigos HTTP habituales: `400` petición inválida, `404` recurso inexistente,
`409` conflicto, `413` cuerpo demasiado grande, `415` tipo no soportado y `500`
error interno. Los códigos de dominio concretos viajan en `error.code`.

## Endpoints principales

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/api/health` | Estado del backend. |
| `GET` | `/api/conversations` | Lista de conversaciones. |
| `GET` | `/api/conversations/:id` | Detalle, ajustes y última página de mensajes. |
| `PATCH` | `/api/conversations/:id/settings` | Ajustes de la conversación. |
| `GET` | `/api/conversations/:id/messages?before=&limit=` | Página de mensajes. |
| `POST` | `/api/conversations/:id/messages` | Enviar mensaje; **SSE**. |
| `POST` | `/api/conversations/:id/continue` | Continuar; **SSE**. |
| `POST` | `/api/conversations/:id/messages/:messageId/regenerate` | Regenerar; **SSE**. |
| `GET` | `/api/conversations/:id/context?pendingMessage=` | Contexto que se enviaría, sin proveedor. |
| `GET` | `/api/conversations/:id/context/stats` | Metadatos y estimación de tokens. |
| `GET` | `/api/conversations/:id/summaries` | Resúmenes de la conversación. |
| `POST` | `/api/conversations/:id/summaries/generate` | Generar un resumen manualmente. |
| `GET` | `/api/providers` | Proveedores registrados. |
| `GET` | `/api/providers/:id/status` | Comprobar conexión. |
| `GET` | `/api/providers/:id/models` | Modelos disponibles. |
| `GET` | `/api/providers/:id/model-context?model=&instanceId=` | Ventana de contexto detectada. |

El resto de rutas (personajes, memorias, propuestas, imágenes, ajustes
globales, túnel y LAN) están en `docs/07-technical-architecture.md`.

### Enviar un mensaje

```http
POST /api/conversations/{conversationId}/messages
Content-Type: application/json
Accept: text/event-stream
Accept-Language: es
```

```json
{ "content": "Hola, ¿cómo estás?" }
```

El backend guarda el mensaje del usuario y emite `saved` antes de generar la
respuesta. El `conversationId` debe existir.

### Continuar

```http
POST /api/conversations/{conversationId}/continue
Accept: text/event-stream
```

No lleva cuerpo. Se usa cuando la última respuesta quedó a medias o se quiere
pedir al personaje que siga hablando.

### Regenerar una respuesta

```http
POST /api/conversations/{conversationId}/messages/{messageId}/regenerate
Accept: text/event-stream
```

No lleva cuerpo. `messageId` debe ser un mensaje de rol `assistant`. El mensaje
regenerado no forma parte del contexto que se envía al modelo.

### Ajustes relevantes

`PATCH /api/conversations/:id/settings` acepta, entre otros:

```json
{
  "provider": "ollama",
  "model": "llama3",
  "contextWindow": 8192,
  "compactionThreshold": 80,
  "maxTokens": 1024,
  "temperature": 0.7
}
```

- `contextWindow` es la ventana del modelo en tokens.
- `compactionThreshold` es el porcentaje (50-95) que dispara la compactación.
- `maxTokens` es la reserva de respuesta y debe ser menor que la ventana.
- Los límites del backend son `maxTokens` ≤ 200 000 y `contextWindow` ≤
  2 000 000; los valores fuera de rango se recortan o se rechazan.
- `recentMessageCount` y `summaryFrequency` siguen aceptándose por
  compatibilidad, pero el motor actual no los usa para decidir el contexto.

### Contexto y estadísticas

```http
GET /api/conversations/{id}/context?pendingMessage=Hola
GET /api/conversations/{id}/context/stats
```

`/context` devuelve el prompt completo (`systemPrompt` y `messages`) y sus
metadatos sin llamar al proveedor. `/context/stats` devuelve solo los metadatos:
ventana, umbral de compactación, tokens estimados del sistema, mensajes,
reserva de respuesta y porcentaje.

## SSE del chat

Las tres rutas de generación responden con `Content-Type: text/event-stream`.
Cada evento tiene el formato:

```
event: <nombre>
data: <json>

```

El stream termina al cerrarse la conexión. **No cierres el cliente al recibir
`done`**: después pueden llegar `title-generated`. Los eventos desconocidos se
ignoran.

### Secuencia típica de `send`

```
saved
compacting?            (solo si hace falta compactar)
context-warning?       (si se recortó contexto)
summary-generated?     (si la compactación creó un resumen)
chunk                  (repetido)
done
title-generated?       (si cambió el título después)
```

`continue` y `regenerate` no emiten `saved`; el resto de la secuencia es igual.

### Eventos

| Evento | Datos | Cuándo |
|---|---|---|
| `saved` | `MessageDTO` | Solo `send`: el mensaje del usuario ya está guardado. |
| `compacting` | `{}` | El servidor está resumiendo/recortando antes de responder. Puede tardar. |
| `context-warning` | `{ code, message }` | La compactación tuvo que recortar mensajes o no pudo resumir. |
| `summary-generated` | `SummaryDTO` | Se creó un resumen durante la compactación. |
| `chunk` | `{ "content": "texto" }` | Fragmento de la respuesta. Concatenar en orden. |
| `done` | `{ "message": MessageDTO, "title"?: string, "titleSource"?: "auto" \| "manual" }` | Respuesta completa. `title` solo aparece si se generó un título. |
| `title-generated` | `{ "title": string, "titleSource": "auto" \| "manual" }` | Título actualizado después de `done`. |
| `error` | `{ "code": string, "message": string }` | Error una vez abierto el stream. El HTTP sigue siendo 200. |

`MessageDTO`:

```json
{
  "id": "019...",
  "conversationId": "019...",
  "role": "assistant",
  "content": "Hola, todo bien.",
  "position": 12,
  "alternatives": [],
  "alternativesCursor": 0,
  "createdAt": "2026-10-28T12:00:00.000Z",
  "editedAt": null
}
```

`SummaryDTO`:

```json
{
  "id": "019...",
  "conversationId": "019...",
  "content": "Resumen acumulativo…",
  "firstMessageId": "019...",
  "lastMessageId": "019...",
  "model": "llama3",
  "provider": "ollama",
  "createdAt": "2026-10-28T12:00:00.000Z",
  "editedAt": null
}
```

### Errores dentro del stream

Códigos propios del chat:

| Código | Significado |
|---|---|
| `CHARACTER_VERSION_NOT_FOUND` | La versión del personaje ya no existe. |
| `CHARACTER_NOT_FOUND` | El personaje ya no existe. |
| `PROVIDER_NOT_CONFIGURED` | No hay proveedor/modelo utilizable. |
| `STREAMING_FAILED` | El proveedor falló durante el streaming. |
| `EMPTY_RESPONSE` | El proveedor devolvió una respuesta vacía. |
| `CONTEXT_TOO_LARGE` | Ni compactando cabe el prompt (o el sistema solo no cabe). |
| `NOT_ASSISTANT_MESSAGE` | Se intentó regenerar un mensaje que no es del asistente. |
| `INTERNAL_ERROR` | Fallo inesperado antes de poder mapear el error. |

Si el error ocurre antes de enviar las cabeceras SSE, se devuelve el JSON de
error normal. Si ya se abrió el stream, se emite `error` y se cierra.

## Compactación y contexto

El backend estima el prompt antes de llamar al proveedor. Si `contextWindow`
está configurada y el total (entrada + `maxTokens`) alcanza
`compactionThreshold`, ocurre lo siguiente:

1. Emite `compacting`.
2. Resume los mensajes más antiguos en uno o varios chunks.
3. Emite `summary-generated` si creó un resumen.
4. Emite `context-warning` si tuvo que recortar o si el resumen falló.
5. Sigue con `chunk`/`done`.

Si no hay `contextWindow`, no se compacta. Si el sistema y el último mensaje no
caben ni recortando, se emite `CONTEXT_TOO_LARGE` y no se genera respuesta.

La compactación **no borra mensajes**: el historial completo sigue en
`GET /api/conversations/:id/messages`. Solo cambia lo que se envía al modelo.

## Cliente mínimo

```ts
const response = await fetch(
  `http://127.0.0.1:3001/api/conversations/${id}/messages`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Accept-Language": "es",
    },
    body: JSON.stringify({ content: "Hola" }),
  },
)

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ""
let event = ""

for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split("\n")
  buffer = lines.pop() ?? ""

  for (const line of lines) {
    if (line.startsWith("event: ")) event = line.slice(7).trim()
    else if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6))
      switch (event) {
        case "saved": /* mensaje del usuario */ break
        case "compacting": /* mostrar estado */ break
        case "context-warning": /* avisar */ break
        case "chunk": /* concatenar data.content */ break
        case "done": /* data.message; no cerrar aún */ break
        case "title-generated": /* actualizar título */ break
        case "error": /* data.code / data.message */ break
        default: /* ignorar eventos nuevos */ break
      }
    }
  }
}
```

### curl

```bash
curl -N -X POST http://127.0.0.1:3001/api/conversations/CONV/messages \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -H 'Accept-Language: es' \
  -d '{"content":"Hola"}'
```

`-N` desactiva el buffering de curl para ver los eventos en tiempo real.

```bash
curl -N -X POST http://127.0.0.1:3001/api/conversations/CONV/continue \
  -H 'Accept: text/event-stream'
```

## Límites de confianza

- El backend está pensado para loopback, LAN de confianza o Tailscale. No hay
  login ni autorización por usuario; no lo expongas directamente a Internet.
- `data/`, `backups/` y los logs pueden contener conversaciones. Protégelos y
  usa cifrado de disco si el equipo es compartido.
- Las claves de proveedor nunca aparecen en DTOs ni en logs.
- Si una clave se filtra en un issue, un log o un chat, rótala; borrar el
  mensaje no es suficiente.
