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

Las actualizaciones nunca reemplazan `data/` ni `backups/`. Podés mover la
carpeta entera, copiarla a otro disco o guardarla en una carpeta sincronizada si
entendés los riesgos de sincronizar una base de datos en uso.

## Copias de seguridad

La app puede crear una copia antes de actualizar. También podés copiar `data/`
con la app detenida. Para una copia portátil de un solo personaje, usá el
diálogo de exportación; puede incluir conversaciones, imágenes y ajustes.

## Actualizaciones

Abrí **Sistema → Actualizaciones**. La app consulta la última release de GitHub,
descarga el paquete de tu plataforma en `versions/<versión>/`, cambia el puntero
`current` y ofrece **Reiniciar ahora**.

- Tu `data/` y tus `backups/` no se tocan.
- La versión anterior queda en disco, así que podés volver.
- Si algo falla, revisá el registro en **Sistema → Registro**.

## Mover a otro ordenador

1. Detené la app.
2. Copiá la carpeta completa, incluida `data/`.
3. Arrancá la app en el ordenador nuevo con el lanzador.

Si solo necesitás un personaje, exportalo como JSON e importalo en la otra
máquina.

## Desinstalar

Detené la app y borrá la carpeta. No hay instalador global ni entrada en el
registro. Si querés conservar tu historia, copiá `data/` primero.
