# S94 — Firma Ed25519 de las releases

**Estado:** Completado (v1.53.0)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

El updater ya verificaba el SHA-256 de cada paquete, pero el checksum vivía en
la misma release que el paquete. Si se comprometía el repositorio o la release,
se podían cambiar ambos a la vez.

S94 firma `SHA256SUMS` con una clave Ed25519 cuya privada vive en un GitHub
Actions Secret. El updater lleva la clave pública embebida y verifica la firma
antes de confiar en el checksum. Una release sin firma o con firma inválida se
rechaza.

## Decisiones

- **Firma del checksum, no de cada asset:** una firma sobre `SHA256SUMS` cubre
  todos los paquetes; después el updater sigue verificando el SHA-256 del asset
  descargado.
- **Formato JSON con `keyId`:** permite tener varias claves públicas en el
  cliente y preparar rotaciones sin cambiar el formato del archivo.
- **Clave privada fuera del repo:** `RM_RELEASE_SIGNING_KEY` en GitHub
  Secrets. La clave pública (`release-2026-10`) está en
  `release-signature.ts`.
- **Guard de clave:** `scripts/release-sign.mjs` comprueba que la privada
  deriva la pública esperada antes de firmar. Un secret equivocado rompe el
  workflow de release, no publica una release inútil.
- **Fail-closed:** si falta `SHA256SUMS.sig`, `check()` marca
  `no-signature`; si la firma no verifica, `apply()` falla antes de descargar o
  extraer el paquete.
- **Transición:** v1.52.0 no verifica firmas; v1.53.0 sí. v1.53.0 se publica
  firmada y las instalaciones antiguas pueden instalarla porque su updater
  ignora la firma. A partir de ahí, las siguientes releases exigen firma.
- **Rotación documentada:** `docs/12-release-signing.md` describe el proceso,
  la transición y la limitación de clientes que se saltan la release de
  transición.
- **Fuera de alcance:** firmar cada asset por separado, firmas múltiples en un
  mismo `.sig`, claves hardware y firma de binarios a nivel de sistema
  operativo.

## Criterios de aceptación

- [x] La release genera `SHA256SUMS.sig` con Ed25519.
- [x] El workflow falla si falta el secret o no coincide con la pública.
- [x] El updater exige firma y la verifica antes del checksum.
- [x] El updater rechaza firmas inválidas, key ids desconocidos y payloads
      malformados.
- [x] La UI explica el estado `no-signature`.
- [x] El secret está configurado en GitHub y la clave privada no está en el
      repo.
- [x] Tests de firma, verificación y estados del updater.
- [x] Backend, frontend, `pnpm check`, build y smoke test en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **619** tests (107 archivos), incluidos firma válida, checksum
  manipulado, key id desconocido, payload malformado, asset sin firma y firma
  inválida.
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Script de firma probado con un par Ed25519 temporal: firma generada y
  verificada correctamente.
- Paquete Linux generado y smoke test completo.
- Release publicada con `SHA256SUMS.sig`; la firma se verifica con la clave
  pública embebida.

## Commits

1. `fc87dbd feat(security): sign release checksums with Ed25519`
2. `docs(slice): add S94 progress and signing guide` (this commit)
