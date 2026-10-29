# S123 — ChatEngine interno y contrato REST/SSE

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Tercera parte del bloque de contexto: extraer la orquestación común de `send`,
`continue` y `regenerate` a un servicio interno (`ChatEngine`) y documentar el
contrato REST/SSE que ya consumen la app y el teléfono, para que un tercer
cliente (por ejemplo, un runtime de VTuber) pueda integrarse sin leer el código
del backend.

No se divide el repositorio ni se publica un paquete: el motor vive en
`application/services/` y sigue usando los mismos puertos y adaptadores.

## Decisiones

- **Servicio compartido, no motor total.** El `ChatEngine` carga y compacta el
  contexto, resuelve el proveedor, ejecuta el bucle de streaming/tool calls,
  extrae y normaliza propuestas, y centraliza la aplicación de memorias y el
  refresco de título. Los casos de uso conservan lo que de verdad difiere:
  crear el mensaje del usuario, crear o actualizar el mensaje del asistente,
  el decaimiento de memorias de `send` y el mapeo a eventos SSE.
- **Eventos compartidos.** `chat-events.ts` define `chunk`, `compacting`,
  `context-warning`, `summary-generated`, `title-generated` y `error`. Los
  casos de uso los reutilizan en sus uniones de eventos y el motor los emite
  mediante `yield*`, sin duplicar interfaces.
- **Contexto con mensaje pendiente.** `send` guarda primero el mensaje del
  usuario y lo pasa como `pendingMessages`; el motor lo añade al contexto
  aunque la lectura de la base de datos aún no lo devuelva. El resto de flujos
  no necesitan ese parámetro.
- **Una instancia en producción.** El contenedor construye un `ChatEngine` y lo
  inyecta en los tres casos de uso. Los tests pueden omitirlo y el caso de uso
  compone uno con sus puertos, lo que mantiene los tests existentes sin
  reescribir los mocks de repositorios.
- **Sin cambios de nombre en el contrato.** Se mantienen `saved`, `chunk`,
  `done`, `summary-generated`, `title-generated`, `compacting`,
  `context-warning` y `error`. Solo se normaliza el payload de `done` de
  `continue` y `regenerate` a `{ "message": … }`, igual que `send`, para que un
  consumidor externo no tenga que aceptar dos formas.
- **Contrato v1 sin prefijo.** `/api` se documenta como v1 estable; los cambios
  son aditivos y los clientes deben ignorar eventos/campos desconocidos. No se
  añade `/api/v1` ni un evento `meta` en esta slice.
- **Documento interno.** El contrato vive en `docs/13-api-contract.md`; la web
  pública sigue siendo documentación de usuario. `07-technical-architecture.md`
  enlaza al contrato y actualiza su tabla de rutas.
- **Fuera de alcance:** paquete `@workspace/engine`, servicio separado,
  autenticación, WebSockets, versionado con prefijo y reescritura de los tests
  de casos de uso para inyectar un motor falso.

## Cambios

### Backend

- `application/services/chat-engine.service.ts`:
  - `prepareContext`: carga personaje, memorias, resumen y mensajes; aplica
    compactación; emite `compacting`/`context-warning`/`summary-generated`;
    devuelve el contexto y el resumen generado.
  - `streamReply`: resuelve proveedor/instancia/modelo, ejecuta el streaming con
    tool calls, limpia el bloque de propuestas, normaliza la respuesta y
    devuelve contenido + propuestas. Guarda propuestas si la respuesta queda
    vacía.
  - `applyMemoryProposals`: guarda propuestas y las aplica en modo automático.
  - `ensureTitle` / `refreshTitle`: primer título y refresco posterior a una
    compactación.
- `application/services/chat-events.ts`: tipos de eventos compartidos.
- `send`, `continue` y `regenerate` usan el motor; el contenedor inyecta una
  única instancia. Se elimina de los casos de uso la duplicación de contexto,
  proveedor, streaming y propuestas.
- `done` de `continue`/`regenerate` se envuelve en `{ message }`.

### Documentación

- `docs/13-api-contract.md`: endpoints, cabeceras, errores, secuencia SSE,
  payloads, compactación, cliente mínimo, curl y límites de confianza.
- `docs/07-technical-architecture.md`: enlace al contrato, rutas de `continue`,
  `regenerate`, `context/stats`, `summaries/generate` y `model-context`.

## Criterios de aceptación

- [x] Existe un `ChatEngine` interno compartido por los tres flujos.
- [x] La preparación de contexto, compactación, proveedor, streaming, tool calls
      y propuestas viven en el motor.
- [x] Los casos de uso conservan solo sus diferencias de persistencia y eventos.
- [x] El contenedor inyecta una sola instancia.
- [x] Los eventos SSE no cambian de nombre y `done` tiene una sola forma.
- [x] El contrato v1 está documentado en `docs/13-api-contract.md`.
- [x] La tabla de rutas de arquitectura está actualizada y enlaza al contrato.
- [x] Tests del motor y de los tres casos de uso.
- [x] `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` y backlog actualizados.

## Verificación

- Backend: **700** tests (118 archivos).
- Frontend: **379** tests (66 archivos), sin cambios de contrato visibles.
- `pnpm check`, `pnpm build` y `pnpm check:arch` en verde.
- La prueba manual con un cliente externo (VTuber/teléfono) queda para cuando
  exista ese consumidor; el contrato y los eventos están cubiertos por tests.

## Commits

1. `refactor(backend): extract the shared chat engine`
2. `refactor(backend): route reply flows through the chat engine`
3. `test(backend): cover the chat engine and done envelope`
4. `docs(api): document the REST/SSE v1 contract`
5. `docs(slice): document S123 chat engine`
