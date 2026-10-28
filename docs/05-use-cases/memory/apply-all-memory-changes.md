# Apply All Memory Changes

## Objetivo

Aceptar todas las propuestas de modificación de memoria dinámica pendientes de una conversación en una sola operación, evitando al usuario tener que revisar y decidir cada propuesta individualmente.

---

## Motivación

Cuando existen múltiples propuestas pendientes, revisarlas una por una puede resultar tedioso. Este caso de uso permite al usuario aceptar el conjunto completo de propuestas de forma masiva.

En modo `auto`, el propio sistema invoca este caso de uso silenciosamente tras cada mensaje para aplicar las propuestas generadas por el LLM sin intervención del usuario.

---

## Actores

### Actor principal

* Usuario (invocación manual desde la UI).
* Sistema (invocación automática en modo `auto`).

### Actores secundarios

* Sistema (ejecuta la operación).

---

## Entidades involucradas

* Conversation
* Memory

---

## Objetos del dominio involucrados

* MemoryChangeProposal (solo lectura; su procesamiento consume las propuestas)

---

## Precondiciones

* La conversación debe existir.
* La conversación no debe estar archivada.
* Deben existir una o varias propuestas de modificación de memoria pendientes de revisión.
* Las propuestas deben haber sido generadas previamente.

---

## Flujo principal

1. El sistema recibe la solicitud de aceptar todas las propuestas pendientes de una conversación.

2. Para cada propuesta en estado `pending`:

   a. Se determina el `processedBy` según el actor que invoca:
      - Si lo invoca el usuario: `processedBy = 'user'`.
      - Si lo invoca el sistema en modo `auto`: `processedBy = 'system'`.

   b. Se aplica la propuesta según su operación:
      - **CREATE**: se crea una nueva entidad `Memory` con los datos de la propuesta.
      - **UPDATE**: se localiza la memoria existente por `targetMemoryId` y se actualizan sus campos. Si los valores son idénticos a los actuales, la propuesta se descarta sin tocar `updatedAt`.
      - **DELETE**: se localiza la memoria existente y se elimina de la conversación.

   c. Si la propuesta no puede aplicarse (memoria inexistente en UPDATE/DELETE, `targetMemoryId` nulo), se descarta automáticamente sin generar error.

3. Todas las propuestas procesadas se marcan como `applied` o `discarded` según el resultado.

4. El sistema devuelve el resultado: cantidad de propuestas aplicadas y descartadas.

---

## Flujos alternativos

### Sin propuestas pendientes

Si no existen propuestas pendientes, el sistema informa que no hay cambios que aplicar. No se modifica ninguna entidad.

---

### Propuestas con targetMemoryId nulo

Si una propuesta UPDATE o DELETE tiene `targetMemoryId` nulo (porque la memoria fue eliminada manualmente mientras la propuesta estaba pendiente), la propuesta se descarta automáticamente sin generar error.

---

### Error en una propuesta individual

Si una propuesta individual falla (por ejemplo, violación de invariante de dominio), se descarta y el sistema continúa con el resto. No se aborta el proceso completo.

---

## Reglas de negocio

* Todas las propuestas pendientes se procesan en una sola operación atómica desde la perspectiva de la base de datos.
* No se permite edición individual de propuestas durante este caso de uso (para editar una propuesta, usar `ApplyMemoryChanges` en modo individual).
* El `processedBy` se registra según el actor que invoca la operación: `user` si lo hace el usuario, `system` si lo hace el sistema en modo `auto`.
* Un UPDATE cuyos valores coinciden con la memoria actual se descarta sin escribir en la base ni modificar `updatedAt`.
* Si una propuesta no puede aplicarse por inconsistencias con el estado actual de la memoria, se descarta de forma segura sin afectar al resto de propuestas.
* Este caso de uso no elimina la posibilidad de que el usuario revise individualmente propuestas antes de aceptarlas (usar `ApplyMemoryChanges` para eso).

---

## Cambios en el dominio

* Se crean cero o más entidades `Memory` nuevas (propuestas CREATE).
* Se modifican cero o más entidades `Memory` existentes (propuestas UPDATE).
* Se eliminan cero o más entidades `Memory` existentes (propuestas DELETE).
* Todas las propuestas pendientes pasan a estado `applied` o `discarded`.

La lista de propuestas pendientes queda vacía independientemente del resultado.

No se modifica ninguna otra entidad del dominio.

---

## Postcondiciones

* La memoria dinámica refleja los cambios de todas las propuestas aceptadas.
* No existen propuestas pendientes de revisión.
* La memoria dinámica actualizada está lista para la siguiente construcción de contexto.
* La conversación no ha sufrido ninguna otra modificación.

---

## Casos de uso relacionados

* ProposeMemoryChanges (genera las propuestas que este caso de uso procesa).
* ApplyMemoryChanges (alternativa para revisar y decidir cada propuesta individualmente).
* SendMessage (invoca este caso de uso automáticamente en modo `auto` tras la generación de propuestas).
* PromptContextBuilder (consume las memorias actualizadas).
