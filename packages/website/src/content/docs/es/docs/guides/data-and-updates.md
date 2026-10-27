---
title: Datos y actualizaciones
description: Dónde viven tus datos, cómo funcionan las copias y qué toca una actualización.
---

## Tu carpeta

El paquete portátil guarda todo dentro de una carpeta:

```text
RoleplayManager/
├── data/        ← base SQLite e imágenes
├── backups/     ← copias de seguridad
├── versions/    ← versiones instaladas
├── current      ← versión activa
└── start.cmd | start.sh
```

Las actualizaciones nunca reemplazan `data/` ni `backups/`. Puedes mover la
carpeta entera, copiarla a otro disco o guardarla en una carpeta sincronizada si
entiendes los riesgos de sincronizar una base de datos en uso.

## Copias de seguridad

La app puede crear una copia antes de actualizar. También puedes copiar `data/`
con la app detenida. Para una copia portátil de un solo personaje, usa el
diálogo de exportación; puede incluir conversaciones, imágenes y ajustes.

## Actualizaciones

Abre **Sistema → Actualizaciones**. La app consulta la última versión de GitHub,
descarga el paquete de tu plataforma en `versions/<versión>/`, cambia el puntero
`current` y ofrece **Reiniciar ahora**.

- Tu `data/` y tus `backups/` no se tocan.
- El paquete descargado se comprueba con el checksum SHA-256 de la versión
  antes de instalarlo.
- La versión anterior queda en disco, así que puedes volver.
- Si algo falla, revisa el registro en **Sistema → Registro**.

## Mover a otro equipo

1. Cierra la app.
2. Copia la carpeta completa, incluida `data/`.
3. Inicia la app en el equipo nuevo con el lanzador.

Si solo necesitas un personaje, expórtalo como JSON e impórtalo en la otra
máquina.

## Desinstalar

Cierra la app y borra la carpeta. No hay instalador global ni entrada en el
registro. Si quieres conservar tu historia, copia `data/` primero.
