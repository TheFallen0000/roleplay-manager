# Workflow de slices con subagentes

Este documento explica el flujo operativo que ejecutan `/slice` y `/release`. La
fuente de verdad para los agentes es
`.opencode/skills/slice-workflow/SKILL.md` y
`.opencode/skills/release-workflow/SKILL.md`; este documento es la versión para
humanos.

## Por qué

Un slice mezcla cuatro trabajos con criterios distintos: decidir arquitectura,
escribir código, demostrar que funciona y publicarlo. Hacerlo todo en un único
contexto diluye el presupuesto del modelo y mezcla autoría con revisión.

El flujo separa esos trabajos en etapas con artefactos verificables:

```
RFC → tests rojos → implementación → review → docs → release
```

La regla es simple: **cada etapa deja un artefacto que la siguiente puede leer**.
No se pasa de etapa porque el agente "cree" que está bien, sino porque el
artefacto lo demuestra.

## Cómo se invoca

```text
/slice S129
/slice S129 --stage=rfc
/slice S129 --stage=review
/release
/release 1.58.0
/release --prepare-only
```

Sin argumentos, `/slice` elige el siguiente slice pendiente de
`docs/10-slices/` y `/release` propone la versión a partir de `[Unreleased]`.

`/slice` selecciona el agente `slice`, que carga la skill `slice-workflow` y
decide qué subagente lanzar en cada etapa. `/release` selecciona el agente
`release`, que carga `release-workflow` y solo toca la versión y el changelog.

## Rama

Antes de escribir código, el orquestador comprueba la rama. Si está en `master`,
crea una rama corta (`feat/SX-slug`, `fix/SX-slug`, `docs/SX-slug` o
`chore/SX-slug`). Nunca se commitea en `master` y no se hace push sin aprobación.

## Etapas y artefactos

| Etapa          | Artefacto                                                 | Quién                         |
| -------------- | --------------------------------------------------------- | ----------------------------- |
| RFC            | `docs/10-slices/SX-progress.md` con `Estado: Draft`       | `slice-architect`             |
| Aprobación     | `Estado: Aprobado`                                        | el usuario                    |
| Test plan      | `docs/10-slices/SX-test-plan.md` (solo tests delicados)   | `slice-test-architect`        |
| Tests rojos    | Tests/evals que fallan + comando y salida en el slice doc | `slice-test-author`           |
| Implementación | Código de producción + tests verdes                       | `slice` o `slice-implementer` |
| Review         | `docs/10-slices/SX-review.md` con hallazgos por severidad | `slice-reviewer`              |
| Docs           | Slice doc completo + `CHANGELOG.md` bajo `[Unreleased]`   | `slice-docs`                  |
| Release checks | Checks + dry-run + PR body + checklist                    | `slice-release`               |
| Ship           | Push + PR + CI + merge squash del slice                   | `slice`                       |

## Agentes

### `slice` (primario)

Orquestador. Lee el RFC, detecta la etapa, decide qué subagente usar y ejecuta
las comprobaciones deterministas. Es el único que puede preparar el release.

- Modelo: `opencode-go/deepseek-v4.1-flash#max`.
- Puede editar código, docs y tests.
- No puede publicar, taggear, mergear ni hacer push sin aprobación.

### `slice-architect` (subagente)

Escribe el RFC. Es read-only para el código y solo edita el slice doc.

- Modelo: `opencode-go/deepseek-v4-pro`.
- Rellena problema, restricciones, opciones, decisión, fuera de alcance,
  criterios de aceptación y plan de eval.
- Deja `Estado: Draft`; no implementa.

### `slice-test-architect` (subagente)

Diseña la matriz de tests para slices delicados. No escribe tests ni código.

- Modelo: `opencode-go/deepseek-v4-pro`.
- Solo edita `docs/10-slices/SX-test-plan.md`.
- Casos, fixtures, aserciones, comandos y riesgos; una página como máximo.

### `slice-test-author` (subagente)

Escribe los tests que fallan y los fixtures del eval. No toca código de
producción ni documentación.

- Modelo: `opencode-go/deepseek-v4.1-flash`.
- Puede editar tests, `test-utils`, configs de test y `**/evals/**`.
- Si existe `SX-test-plan.md`, lo sigue; no amplía la matriz por su cuenta.
- Devuelve el comando exacto y el fallo esperado.

### `slice-implementer` (subagente)

Implementa el código de producción contra el RFC y los tests rojos. No puede
editar tests, docs ni changelog.

- Modelo: `opencode-go/deepseek-v4.1-flash`.
- Se usa cuando el slice cruza capas o toca más de cinco archivos.
- Trabaja en chunks secuenciales; nunca dos agentes sobre los mismos archivos.

### `slice-reviewer` (subagente)

Revisión adversarial e independiente. No edita nada.

- Modelo: `opencode-go/deepseek-v4-pro`.
- Recibe el RFC, el diff y la evidencia de tests.
- Devuelve hallazgos por severidad con archivo y línea.
- El orquestador escribe su informe en `SX-review.md`.
- Si quieres diversidad de modelo, cambia este agente a Kimi K3.1 Pro o GLM-5.3;
  el implementador seguirá en Flash.

### `slice-docs` (subagente)

Actualiza la documentación a partir del diff implementado. No toca código ni
tests.

- Modelo: `opencode-go/deepseek-v4.1-flash`.
- Solo puede editar `docs/*` y `CHANGELOG.md`.
- Redacta el PR body y completa el slice doc.

### `slice-release` (subagente)

Auditor de release para un slice. Es read-only: no edita, no hace push, no
mergea y no publica.

- Modelo: `opencode-go/deepseek-v4.1-flash`.
- Ejecuta checks, tests, build, audit y el dry-run de empaquetado.
- Devuelve un checklist con pass/fail y comandos exactos.

### `release` (primario)

Operador del release batched. Solo toca `package.json`, `CHANGELOG.md` y el PR
body temporal; nunca código de features.

- Modelo: `opencode-go/deepseek-v4.1-flash`.
- Bump de versión, roll del changelog, PR `chore(release): vX.Y.Z`, merge y
  verificación.
- No crea tags ni releases a mano: eso lo hace el workflow de GitHub Actions.

## Reglas de decisión

El orquestador no pregunta qué subagente usar; lo decide con esta tabla:

- **RFC:** `slice-architect` en V4 Pro.
- **Tests delicados:** primero `slice-test-architect` (V4 Pro) escribe el plan;
  después `slice-test-author` (Flash) lo implementa.
- **Tests normales:** directamente `slice-test-author` (Flash).
- **Implementación:** el orquestador si es pequeño y de una capa;
  `slice-implementer` (Flash) si cruza capas o supera cinco archivos.
- **Review:** siempre `slice-reviewer` (V4 Pro), nunca auto-review.
- **Docs:** siempre `slice-docs` (Flash) después de un review limpio.
- **Release checks:** siempre `slice-release` (Flash), después de docs.
- **Ship del slice:** el orquestador (Flash), con aprobación para push y merge.
- **Bump de versión y publish:** comando `/release`, no `/slice`.

## Sesiones y contexto

Una sesión larga reenvía todo su historial en cada paso. Por eso el flujo usa el
repo como handoff, no el chat:

- Empieza una **sesión nueva por slice** y, si el slice es grande, una por etapa:
  RFC, implementación, review.
- No continúes una sesión que ya lleva varios slices o un contexto enorme.
- Si una sesión supera aproximadamente **20m de cache reads**, corta y sigue en
  una sesión nueva desde el RFC y la rama.
- Usa `opencode stats --project . --days 0 --full` al cerrar cada etapa.
- No vuelques archivos enteros, diffs completos ni logs largos en la sesión
  principal: usa `read` con límites, `grep`, `glob` y `explore`.
- Guarda resultados en el slice doc o en el informe del subagente, no en el chat.

En la TUI, una sesión nueva se abre con `Ctrl+X` y luego `N`, o con `/new`. Las
sesiones existentes se recuperan con `Ctrl+X` y luego `L`, o con `/sessions`.

## Permisos

Los subagentes tienen permisos por rol, no edición global. Eso es deliberado: el
reviewer queda read-only y el test-author no puede tocar código de producción.
Los subagentes usan **deny-by-default** para shell: si un comando legítimo falta,
fallan rápido y el orquestador amplía la allowlist. No usan `ask`, porque una
sesión desatendida se quedaría esperando una aprobación que nadie ve.

Si un subagente reporta un bloqueo de permisos:

1. Confirma que la ruta forma parte de su trabajo.
2. Amplía el permiso en `.opencode/agents/<agente>.md`.
3. Retoma desde el último artefacto; no le pidas que escriba con shell para
   saltarse el permiso.

No des edición al reviewer ni acceso a tests/configs al implementador. Si una
tarea necesita un rol más amplio, divídela.

`slice-release` es read-only salvo su informe: escribe
`docs/10-slices/SX-release.md` con la herramienta de edición, no con
redirecciones de shell. Para inspeccionar archivos usa `read`/`grep`/`glob`; el
shell queda para `pnpm`, git y gh. Si el build ensucia un archivo generado, lo
reporta y el orquestador lo restaura.

## Puertas humanas

El flujo se detiene y pide intervención solo cuando:

- el RFC está en `Draft`,
- el alcance cambia respecto al RFC,
- aparece una decisión de arquitectura no cubierta,
- el review tiene bloqueantes que exigen rediseño,
- hay que hacer push o merge del PR del slice,
- hay que elegir la versión, hacer push/merge del PR de release o publicar.

Todo lo demás es autónomo: detectar etapa, lanzar subagentes, reintentar tests,
corregir fallos pequeños, actualizar docs y ejecutar checks.

## Push, PR, merge y versión

| Acción                      | Quién          | Aprobación           |
| --------------------------- | -------------- | -------------------- |
| Commit local del slice      | `slice`        | no                   |
| Push de la rama del slice   | `slice`        | sí                   |
| PR del slice                | `slice`        | sí                   |
| Merge del PR del slice      | `slice`        | CI verde + sí        |
| Bump de versión             | `release`      | sí                   |
| PR `chore(release): vX.Y.Z` | `release`      | sí                   |
| Merge del release PR        | `release`      | CI verde + sí        |
| Publicar la release         | GitHub Actions | merge del release PR |
| Verificar assets/firma/web  | `release`      | no                   |

La regla es: **`/slice` integra el slice; `/release` publica el batch**. Ninguno
hace el trabajo del otro. Los títulos y cuerpos de PR se escriben en inglés; el
`CHANGELOG.md` sigue en español porque es texto para usuarios.

## Tests y verificación

Comandos de referencia:

```sh
pnpm check
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm build
pnpm audit --prod
git diff --check
```

Para cambios de dependencias, lockfile, módulos nativos o empaquetado:

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref <branch> -f publish=false
gh run watch <run-id> --repo TheFallen0000/roleplay-manager
```

Deben pasar los cinco targets: `win-x64`, `linux-x64`, `linux-arm64`,
`mac-arm64`, `mac-x64`.

## Release batched (`/release`)

`/release` es un flujo distinto de `/slice`:

1. Comprueba que `master` está limpio y al día, y que `[Unreleased]` no está
   vacío.
2. Propone el bump semver (major/minor/patch) y espera aprobación.
3. Crea `chore/release-vX.Y.Z`, sube la versión del `package.json` raíz y mueve
   `[Unreleased]` a `## [X.Y.Z] - fecha`.
4. Ejecuta checks, tests, build, audit y el dry-run de los cinco targets.
5. Commitea `chore(release): vX.Y.Z`, hace push y abre el PR de release.
6. Espera CI, mergea con squash y deja que el workflow de release publique.
7. Verifica assets, SHA-256, firma Ed25519, smoke test y versión de la web.

No crea tags a mano, no usa `gh release create` y no toca código de features.
El merge del PR de release es el disparador de la publicación.

## Qué demuestra que el slice está bien

- Tests rojos que ahora pasan.
- `pnpm check` y `pnpm build` en verde.
- Review independiente sin bloqueantes.
- `CHANGELOG.md` y slice doc actualizados.
- Si aplica, eval de comportamiento con baseline y umbral.
- Release dry-run en verde cuando cambian dependencias o empaquetado.

## ¿Hace falta el SDK/API?

No para el uso interactivo. El agente primario ya puede lanzar subagentes con la
herramienta `subagent`; la decisión se codifica en la skill y en los permisos.

El SDK/API solo hace falta si quieres ejecutar el flujo **fuera** de una sesión
de OpenCode: CI, cron, otra aplicación o un orquestador determinista que no
dependa de un LLM. Para este repositorio, empieza con `/slice`; añade SDK solo si
el comando se queda corto.

## Coste

El routing está pensado para no quemar el modelo caro:

- **V4 Pro:** RFC, diseño de tests delicados y review.
- **Flash `#max`:** orquestación.
- **Flash:** tests normales, implementación, docs y release.
- El trabajo mecánico no consume V4 Pro.
- Los subagentes no tienen límite fijo de pasos. Si uno falla dos veces o la
  tarea crece, se divide; no entra en bucles.
- La mayor palanca es la sesión: una sesión nueva por etapa suele ahorrar más
  que cambiar de modelo.

## Añadir un subagente

1. Crea `.opencode/agents/slice-<rol>.md`.
2. Usa `mode: subagent`, `model` y `permissions`; no pongas `steps`.
3. Restringe la edición a lo que ese rol necesita.
4. Añádelo a la tabla de routing de la skill.
5. Ejecuta `opencode debug agents` para comprobar que se descubre.
