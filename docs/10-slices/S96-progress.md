# S96 — Seguridad de datos locales

**Estado:** Completado (v1.54.1); cifrado en reposo **descartado**
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Tras revisar el modelo de amenaza, se descarta añadir cifrado a nivel de
aplicación (passphrase o SQLCipher). El público objetivo es un equipo de
sobremesa con GPU, uso local-first y Tailscale/LAN como límite de confianza. En
ese contexto, el cifrado de disco completo del sistema operativo cubre el
escenario realista sin añadir desbloqueo, recuperación de claves ni migraciones
de SQLite.

S96 queda como un cambio pequeño de hardening local:

- `umask 077` en Unix antes de crear archivos.
- `data/`, `backups/` y logs con permisos `700`; base de datos, WAL y SHM con
  `600`.
- Documentación de seguridad para el usuario: cifrado de disco, backups en
  texto plano y rotación de API keys.

## Decisiones

- **Cifrado de disco completo, no de app:** BitLocker, FileVault o LUKS protegen
  el disco robado. Una clave de app en el mismo disco no aporta nada frente a
  ese escenario; una passphrase sí, pero cambia la UX, los backups y el
  autoarranque.
- **Sin passphrase ni SQLCipher:** implicaría desbloqueo al iniciar,
  recuperación si se olvida, migración de bases existentes y un módulo nativo
  más. No compensa para el público objetivo.
- **API keys en SQLite:** la respuesta a un equipo o backup perdido es rotar las
  claves en el proveedor; quitarlas de la app no las revoca. Los backups son
  copias en texto plano y deben protegerse en su destino.
- **Permisos POSIX:** `umask 077` y `chmod` para que otros usuarios del mismo
  equipo no lean datos, logs ni copias. En Windows se delega en la cuenta del
  sistema y BitLocker.
- **Sin cifrar backups:** se documenta que una copia en USB o nube debe
  protegerse allí. Cifrar solo los backups sin cifrar `data/` daría una falsa
  sensación de seguridad.
- **Reabrir solo con un caso concreto:** backups sincronizados en la nube,
  equipos compartidos o un requisito explícito de passphrase.

## Criterios de aceptación

- [x] `umask 077` se aplica al arrancar en Unix.
- [x] `data/`, `backups/` y logs quedan en `700`.
- [x] La base SQLite, WAL y SHM quedan en `600`.
- [x] Los permisos se aplican también en instalaciones existentes.
- [x] La documentación explica cifrado de disco, backups y rotación de claves.
- [x] S96 (cifrado en reposo) queda descartado en el backlog con su rationale.
- [x] Backend, frontend, `pnpm check`, build y smoke test en verde.

## Verificación

- Backend: **624** tests (109 archivos), incluidos permisos de directorio, base
  de datos y `umask`.
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test completos.
- Base de datos y carpetas del paquete con permisos `600`/`700` en Linux.

## Commits

1. `75e0741 chore(security): restrict local data permissions`
2. `docs(slice): document local data security and discard encryption` (this commit)
