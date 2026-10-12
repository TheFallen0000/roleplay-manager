# S64 — Flujo de contribución, CI en PRs y protección de master

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

Hasta ahora todo se empujaba directo a `master`: sin PRs, sin CI sobre las
propuestas y sin protección (un futuro colaborador con write podría empujar sin
control; `CONTRIBUTING.md` prometía una CI que no existía). Se adopta un flujo
**trunk-based con PRs**, una CI para PRs y protección estricta de `master`, más
plantillas de PR/issues y la documentación del flujo.

## Decisiones

- **Trunk-based con PRs** (elegido): `master` protegida + ramas cortas
  (`feat/…`, `fix/…`, `docs/…`, `chore/…`) + PR con CI obligatoria + squash
  merge + borrar rama. Sin `develop`/`release/*`: los releases siguen saliendo
  de `master` con el flujo actual.
- **CI para PRs** (`.github/workflows/ci.yml`, workflow `CI`, job **Checks**;
  nombre distinto al `Quality gates` del release para no confundir checks):
  instalación congelada + `pnpm check` + tests backend/frontend + `pnpm build`,
  en `pull_request` y en `push` a `master`, con cancelación de corridas viejas.
  **Sin `paths-ignore` a propósito**: un check obligatorio que no corre
  bloquearía para siempre los PRs de solo-docs.
- **Protección estricta, sin bypass** (elegida): PR obligatoria + check
  `Checks` (con rama actualizada), historial lineal, force-push y borrado
  prohibidos, `enforce_admins` activado. 0 aprobaciones mientras haya un solo
  mantenedor (GitHub no permite aprobar el PR propio); cuando exista un segundo
  mantenedor se sube a 1.
- **Merge squash-only** y `delete_branch_on_merge: true` en el repositorio.
- **Plantillas**: PR (qué / por qué / cómo se probó + checklist) e issues (bug
  con versión, sistema e instalación; feature con el encuadre local-first).
- **Reparto de responsabilidades**: los contribuidores no tocan `package.json`
  ni `CHANGELOG.md` (lo pide el template y lo explica `CONTRIBUTING.md`); el
  mantenedor prepara el release.
- **Discussions** se activa como canal para preguntas abiertas y el `config.yml`
  de issues enlaza allí.
- El agente abre el PR, espera el CI y lo fusiona (aprobado por el usuario).

## Criterios de aceptación

- [x] Workflow `CI` corriendo en el PR de este slice (verde).
- [x] Plantillas de PR e issues presentes en `.github/`.
- [x] Protección de `master` activa: PR obligatoria, check `Checks`, sin
      force-push ni borrado, `enforce_admins`.
- [x] Squash-only, borrado de rama al mergear y Discussions activo.
- [x] Flujo documentado en `CONTRIBUTING.md`, `AGENTS.md` y ambos READMEs.
- [x] Push directo a `master` rechazado (verificado con un push de prueba).

## Verificación

- El PR de este slice pasó **Checks** (gates + tests + build) y se fusionó por
  squash; la rama quedó borrada.
- `GET /repos/…/branches/master/protection` devuelve las reglas esperadas y un
  push directo de prueba fue rechazado por el remoto.
- El merge disparó la release v1.40.2 automáticamente.

## Commits

1. `ci: add the pull-request workflow and contribution templates`
2. `docs: document the protected-branch git flow`
3. `docs(slice): add S64 progress`
4. `release: bump to v1.40.2 and add changelog entry`
