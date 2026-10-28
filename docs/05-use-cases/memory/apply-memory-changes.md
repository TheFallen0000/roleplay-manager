# Apply Memory Changes

## Objetivo

Permitir al usuario revisar, modificar, aceptar o descartar las propuestas de modificación de memoria dinámica generadas por la inteligencia artificial, aplicando finalmente los cambios aprobados sobre las entidades `Memory` de la conversación.

---

## Motivación

La inteligencia artificial puede generar propuestas para crear, modificar o eliminar memorias dinámicas después de cada interacción, pero dichas propuestas nunca deben aplicarse automáticamente.

El usuario debe conservar siempre la decisión final sobre qué información forma parte de la memoria de la conversación.

Este caso de uso cierra el ciclo iniciado por `ProposeMemoryChanges`, otorgando al usuario el control total sobre la evolución de la memoria dinámica y permitiéndole ajustar los detalles de cada propuesta antes de confirmarla.

---

## Actores

### Actor principal

* Usuario.

### Actores secundarios

* Sistema.

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
* Las propuestas deben haber sido generadas previamente por el caso de uso `ProposeMemoryChanges`.

---

## Flujo principal

1. El usuario abre el panel de propuestas pendientes de la conversación.

2. El sistema muestra la lista completa de propuestas, indicando para cada una:

   * Operación (CREAR, MODIFICAR o ELIMINAR).
   * Actor al que pertenece la memoria.
   * Título actual y propuesto.
   * Descripción actual y propuesta.
   * Prioridad actual y propuesta.
   * Motivo de la propuesta, si fue proporcionado.

3. Para cada propuesta, el usuario elige una de las siguientes acciones:

   * **Aceptar** — la propuesta se aplica exactamente como fue generada.
   * **Modificar y aceptar** — el usuario edita los campos que considere necesarios antes de aplicar la propuesta.
   * **Descartar** — la propuesta se descarta sin aplicar ningún cambio.

4. Si el usuario decide modificar una propuesta, el sistema presenta los campos editables y permite al usuario ajustar cualquier valor antes de confirmar.

5. El sistema procesa cada propuesta aceptada según su operación:

   * **CREATE**: se crea una nueva entidad `Memory` en la conversación con los datos proporcionados.
   * **UPDATE**: se localiza la memoria existente por su id y se actualizan sus campos. Si los valores propuestos son idénticos a los actuales, la propuesta se descarta sin modificar `updatedAt` (no se alarga el decaimiento).
   * **DELETE**: se localiza la memoria existente y se elimina de la conversación.

6. El sistema registra que los cambios fueron realizados por el usuario (no por la IA).

7. Una vez procesadas todas las propuestas, el sistema limpia la lista de propuestas pendientes.

8. La memoria dinámica actualizada queda disponible para su uso en la siguiente construcción de contexto.

---

## Flujos alternativos

### Sin propuestas pendientes

Si el usuario intenta revisar propuestas sin que exista ninguna pendiente, el sistema informa que no hay cambios pendientes de revisión.

---

### Aceptación parcial

El usuario puede aceptar algunas propuestas y descartar otras en la misma sesión de revisión.

Las propuestas descartadas se eliminan sin afectar a la memoria dinámica.

---

### Modificación de una propuesta

Cuando el usuario modifica una propuesta antes de aceptarla, el sistema aplica los valores editados en lugar de los valores originales propuestos por la IA.

El cambio se registra como una modificación directa del usuario.

---

### Propuesta de eliminación de una memoria inexistente

Si una propuesta DELETE hace referencia a una memoria que ya fue eliminada (por ejemplo, por una edición manual del usuario), la propuesta se descarta automáticamente sin generar error.

---

### Propuesta de modificación de una memoria inexistente o modificada

Si una propuesta UPDATE hace referencia a una memoria que ya no existe o cuyos datos difieren significativamente de los registrados, el sistema notifica al usuario y permite descartar la propuesta o ajustar manualmente los valores antes de aplicarla.

---

### Usuario descarta todas las propuestas

Si el usuario descarta la totalidad de las propuestas, la memoria dinámica permanece inalterada y la lista de propuestas pendientes se limpia.

---

## Reglas de negocio

* Las propuestas nunca se aplican automáticamente; requieren siempre la aprobación del usuario.
* El usuario puede aceptar, modificar o descartar cada propuesta de forma independiente.
* La modificación de una propuesta por parte del usuario sustituye completamente los valores propuestos por la IA.
* Una vez procesada una propuesta, esta se elimina de la lista de pendientes y no puede reaplicarse.
* Los cambios aplicados se registran como realizados por el usuario.
* La aplicación de cambios sobre la memoria dinámica no afecta a los mensajes, resúmenes ni al estado narrativo de la conversación.
* Las memorias creadas mediante este caso de uso heredan los valores proporcionados sin validación adicional más allá de las reglas del dominio (prioridad entre 1 y 10, actor no vacío, título no vacío).
* Un UPDATE cuyos valores coinciden con la memoria actual se descarta sin escribir en la base ni modificar `updatedAt`.
* Si una propuesta no puede aplicarse por inconsistencias con el estado actual de la memoria, se descarta de forma segura sin afectar al resto de propuestas.

---

## Cambios en el dominio

Al finalizar correctamente el caso de uso pueden producirse los siguientes cambios:

* Se crean cero o más entidades `Memory` nuevas (propuestas CREATE aceptadas).
* Se modifican cero o más entidades `Memory` existentes (propuestas UPDATE aceptadas).
* Se eliminan cero o más entidades `Memory` existentes (propuestas DELETE aceptadas).

La lista de propuestas pendientes queda vacía independientemente de las decisiones tomadas.

No se modifica ninguna otra entidad del dominio.

---

## Postcondiciones

* La memoria dinámica refleja los cambios aprobados por el usuario.
* Las propuestas aceptadas han sido aplicadas y no pueden reaplicarse.
* Las propuestas descartadas han sido eliminadas sin efecto.
* No existen propuestas pendientes de revisión.
* La conversación no ha sufrido ninguna otra modificación.
* La memoria dinámica actualizada está lista para ser utilizada en la siguiente construcción de contexto.

---

## Casos de uso relacionados

* ProposeMemoryChanges (genera las propuestas que este caso de uso procesa).
* SendMessage (durante su ejecución se generan las propuestas que posteriormente revisa el usuario).
* PromptContextBuilder (consume las memorias activas después de ser actualizadas).
* EditMessage (puede generar inconsistencias con propuestas pendientes).
* RewindConversation (puede invalidar propuestas pendientes al retroceder el estado de la conversación).

---

## Futuras extensiones

En versiones posteriores este caso de uso podrá ampliarse para soportar:

* Configuración para aplicar automáticamente propuestas por debajo de un umbral de prioridad.
* Historial de cambios aplicados sobre la memoria dinámica.
* Deshacer cambios aplicados recientemente.
* Resolución automática de conflictos entre propuestas superpuestas.
* Notificaciones al usuario cuando existan propuestas pendientes sin revisar.
* Programación de revisión diferida de propuestas.
