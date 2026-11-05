# SX — Título del slice

**Estado:** Draft
**Inicio:** YYYY-MM-DD
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Qué entrega el slice y por qué. Una o dos frases.

## RFC

### Problema

Qué falla o qué falta, con evidencia. Si hay un fallo reproducible, incluye la
conversación, el endpoint o el comando.

### Restricciones

Arquitectura, compatibilidad, rendimiento, privacidad, presupuesto de tokens,
plataformas y cualquier decisión que no se pueda cambiar en este slice.

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| A      |          |        |           |
| B      |          |        |           |

### Decisión

La opción elegida y por qué. Incluye lo que se descarta explícitamente.

### Fuera de alcance

Lo que no entra en este slice y dónde queda registrado (backlog, PM, otro
slice).

## Plan de eval

Obligatorio para memoria, contexto, prompts o comportamiento del modelo.

- **Fixtures:** conversaciones o escenarios concretos.
- **Métricas:** recall, contradicciones, fugas, activación, presupuesto,
  latencia, coste.
- **Baseline:** resultado del sistema actual.
- **Umbral:** qué mejora se exige para aceptar el slice.

## Criterios de aceptación

- [ ] ...
- [ ] ...

## Red tests

- **Comando:**
- **Fallo esperado:**
- **Salida relevante:**

## Decisiones

Decisiones tomadas durante la implementación y su justificación. Si cambia el
RFC, explica por qué.

## Verificación

- Tests: ...
- `pnpm check`: ...
- `pnpm build`: ...
- `pnpm audit --prod`: ...
- Release dry-run: ...
- Prueba manual: ...

## Review

- **Estado:** pendiente | PASS | PASS WITH NOTES | BLOCKED
- **Informe:** `docs/10-slices/SX-review.md`
- **Bloqueantes resueltos:** ...

## Deferred

Notas y nits que no bloquean el slice y dónde se recogen.

## Commits

1. `tipo(scope): ...`
