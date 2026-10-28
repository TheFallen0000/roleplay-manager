# Propose Memory Changes

## Objetivo

Solicitar al modelo de inteligencia artificial que analice el intercambio más reciente de la conversación y genere propuestas de creación, modificación o eliminación de memorias dinámicas para mantener actualizada la base de hechos relevantes de la historia.

---

## Motivación

Cada nuevo mensaje en la conversación puede introducir información relevante que conviene conservar, modificar hechos previamente establecidos o hacer que ciertas memorias pierdan su utilidad narrativa.

Sin embargo, el modelo no debe modificar directamente la memoria dinámica. El usuario conserva siempre la decisión final sobre cualquier cambio.

Este caso de uso actúa como puente entre la evolución natural de la historia y el control del usuario, generando propuestas que este podrá revisar, aceptar, modificar o descartar posteriormente mediante `ApplyMemoryChanges`.

---

## Actores

### Actor principal

* Sistema.

### Actores secundarios

* Modelo de inteligencia artificial.
* Usuario (como revisor y decisor final de las propuestas).

---

## Entidades involucradas

* Conversation
* Memory

---

## Objetos del dominio involucrados

* MemoryChangeProposal

---

## Precondiciones

* La conversación debe existir.
* La conversación no debe estar archivada.
* Debe existir un proveedor de inferencia disponible.
* Debe haberse completado la generación de la respuesta del asistente para el mensaje actual.
* Si el caso de uso `GenerateSummary` ha sido ejecutado durante este ciclo, debe haberse completado antes de iniciar este caso de uso.

---

## Flujo principal

1. El sistema recibe la solicitud de generar propuestas de modificación de memoria para una conversación específica.

2. Se recuperan todas las memorias activas de la conversación.

3. Se recuperan los mensajes más recientes de la conversación, incluyendo al menos el último mensaje del usuario y la última respuesta del asistente.

4. Si se ha generado un nuevo resumen durante este ciclo, se incluye como información adicional para contextualizar las propuestas.

5. Se construye un contexto de generación compuesto por:

   * Instrucciones del sistema sobre el formato y las reglas de las propuestas.
   * Las memorias activas actuales de la conversación.
   * El intercambio más reciente (mensaje del usuario y respuesta del asistente).
   * El resumen más reciente, si existe.

6. Se envía el contexto al proveedor de inteligencia artificial solicitando sugerencias de cambios sobre la memoria dinámica.

7. El modelo analiza el intercambio y genera una o varias propuestas estructuradas.

8. El sistema interpreta la respuesta del modelo mediante uno de los siguientes formatos y construye una lista de objetos `MemoryChangeProposal`, cada uno con:

   * Operación (CREATE, UPDATE o DELETE).
   * Actor al que pertenece la memoria.
   * Título.
   * Descripción.
   * Prioridad propuesta.

9. Las propuestas se asocian temporalmente a la conversación, quedando disponibles para que el usuario las revise.

10. El sistema devuelve la lista de propuestas generadas al caso de uso solicitante.

---

## Flujos alternativos

### Sin memorias existentes

Si la conversación no posee ninguna memoria activa, el contexto de generación se enviará omitiendo la sección de memorias actuales.

El modelo podrá proponer la creación de las primeras memorias basándose exclusivamente en el intercambio reciente.

---

### Sin cambios necesarios

Si el modelo determina que el intercambio más reciente no introduce información relevante ni modifica hechos existentes, podrá devolver una lista vacía de propuestas.

No se genera ninguna propuesta ni se modifica el estado de la memoria dinámica.

---

### Propuestas inválidas o malformadas

Si el modelo devuelve propuestas que no pueden ser interpretadas correctamente (formato incorrecto, operación no reconocida, datos incompletos), el sistema descarta individualmente cada propuesta inválida y conserva aquellas que sean correctas.

Las propuestas UPDATE o DELETE con un `targetMemoryId` que no existe en la conversación también se descartan individualmente. Una propuesta CREATE sin `actor` o sin `title` no se guarda.

Si ninguna propuesta puede interpretarse, el sistema devuelve una lista vacía.

---

### Error durante la generación

Si el proveedor de inferencia no consigue generar una respuesta, el sistema no crea ninguna propuesta.

La conversación conserva su estado actual sin modificaciones en la memoria dinámica.

---

### Proveedor no disponible

Si no existe ningún proveedor configurado o este no puede establecer conexión, el caso de uso finaliza sin generar propuestas y sin alterar el estado de la conversación.

---

## Reglas de negocio

* Las propuestas nunca modifican directamente las memorias.
* El usuario tiene siempre la decisión final sobre cualquier cambio en la memoria dinámica.
* Cada propuesta representa una única operación (CREATE, UPDATE o DELETE).
* Varias propuestas pueden referirse a una misma memoria existente.
* El sistema no debe aplicar ninguna propuesta automáticamente durante este caso de uso.
* El sistema soporta dos formatos de propuesta: bloque delimitado y tool call (ver "Formatos de propuesta soportados").
* Solo se proponen hechos duraderos (relaciones, secretos, promesas, deudas, heridas, objetos importantes, lugares, objetivos o cambios de estado), no cada acción, emoción o línea de diálogo.
* Antes de crear una memoria se revisa la lista existente: si el hecho ya está, se propone UPDATE con su id en vez de duplicarlo.
* El actor usa el nombre exacto de la conversación; para los hechos del personaje del usuario, su nombre.
* El título y la descripción se escriben en el idioma de la conversación.
* La prioridad propuesta se limita al rango 1-10; la escala narrativa es 1-3 detalle menor, 4-6 hecho relevante, 7-9 cambio importante y 10 hecho definitorio.
* El análisis del modelo debe limitarse al intercambio más reciente; no debe reanalizar el historial completo.
* Este caso de uso no modifica ninguna entidad del dominio.

---

## Cambios en el dominio

Este caso de uso no modifica ninguna entidad.

Su única responsabilidad consiste en generar una lista de objetos temporales `MemoryChangeProposal`.

Las memorias activas de la conversación permanecen inalteradas.

---

## Postcondiciones

* Existe una lista de propuestas de modificación de memoria asociada temporalmente a la conversación.
* Las propuestas pueden ser una combinación de CREATE, UPDATE y DELETE.
* La lista puede estar vacía si el modelo no identificó cambios necesarios.
* Las memorias activas de la conversación no han sido modificadas.
* Las propuestas están disponibles para que el usuario las revise y decida su aplicación mediante `ApplyMemoryChanges`.

---

## Formatos de propuesta soportados

El sistema acepta propuestas de modificación de memoria en dos formatos intercambiables. El formato utilizado depende de las capacidades del adaptador del proveedor de IA conectado.

### Formato bloque delimitado

El modelo incluye un bloque de código con lenguaje `memory_proposals` al final de su respuesta:

````text
```memory_proposals
[
  { "operation": "CREATE", "actor": "Alice", "title": "Ubicación", "description": "Se encuentra en la biblioteca.", "priority": 7 },
  { "operation": "UPDATE", "targetMemoryId": "mem-1", "title": "Estado", "description": "Ahora está preocupado.", "priority": 8 },
  { "operation": "DELETE", "targetMemoryId": "mem-2" }
]
```
````

El sistema parsea el contenido del bloque como JSON. `operation` es obligatorio. Para CREATE, `actor` y `title` son obligatorios; `description` y `priority` son opcionales. Para UPDATE, basta con `targetMemoryId` y los campos que cambian: los omitidos se completan desde la memoria objetivo. Para DELETE, solo se necesita `operation` y `targetMemoryId`: el resto se hidrata desde la memoria.

### Formato tool call

Cuando el adaptador del proveedor soporta herramientas nativas (OpenAI-compatible, Ollama), el modelo puede utilizar la herramienta `propose_memory_changes` para generar propuestas estructuradas. Cada llamada a la herramienta representa una propuesta individual.

**Schema de la herramienta:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `operation` | `string` (enum) | Sí | `CREATE`, `UPDATE` o `DELETE` |
| `targetMemoryId` | `string` | Sí para UPDATE/DELETE | Id exacto de la memoria objetivo; se ignora en CREATE |
| `actor` | `string` | Sí para CREATE | Actor al que pertenece la memoria; en UPDATE se conserva si se omite y en DELETE se hidrata |
| `title` | `string` | Sí para CREATE | Título de la memoria; en UPDATE se conserva si se omite y en DELETE se hidrata |
| `description` | `string` | Sí para CREATE | Descripción; en UPDATE se conserva si se omite y en DELETE se hidrata |
| `priority` | `number` | No | Entero entre 1 y 10; en UPDATE se conserva si se omite |

El schema solo marca `operation` como requerido: la obligatoriedad del resto depende de la operación. Los campos opcionales permiten que UPDATE y DELETE no tengan que repetir datos que ya existen en la memoria objetivo.

**Comportamiento del parser:**

- Si una tool call tiene `operation: "UPDATE"` o `"DELETE"` sin `targetMemoryId` (o con un id que no existe), la propuesta se descarta individualmente y se registra una advertencia en el backend.
- Las tool calls se acumulan durante el streaming (tool call deltas) y se procesan al completarse la generación.
- Si el adaptador no soporta tool calls, el sistema recurre automáticamente al formato bloque delimitado como fallback.
- Si hay tool calls pero no producen propuestas válidas, también se usa el bloque delimitado como fallback.
- El bloque `memory_proposals` se elimina del contenido guardado aunque haya tool calls, para que no aparezca al recargar el mensaje.
- Las propuestas inválidas (CREATE sin actor o título) y las prioridades fuera de rango se descartan o se limitan a 1-10 sin abortar el resto del lote.

---

## Casos de uso relacionados

* SendMessage (invoca este caso de uso tras la generación de la respuesta y el resumen).
* GenerateSummary (se ejecuta antes de este caso de uso dentro del flujo de SendMessage).
* ApplyMemoryChanges (caso de uso iniciado por el usuario para aplicar o descartar las propuestas generadas).
* PromptContextBuilder (consume las memorias activas para construir el contexto).
* GenerateCharacterResponse (genera la respuesta del asistente que este caso de uso analiza).

---

## Futuras extensiones

En versiones posteriores este caso de uso podrá ampliarse para soportar:

* Detección de conflictos entre memorias con resolución automática propuesta.
* Propuestas que abarquen múltiples intercambios en lugar de únicamente el más reciente.
* Creación automática de nuevos actores para la memoria dinámica.
* Consolidación de memorias redundantes o contradictorias.
* Propuestas condicionales que dependan de eventos futuros de la conversación.
