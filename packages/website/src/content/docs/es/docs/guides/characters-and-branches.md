---
title: Personajes y ramas
description: Personajes versionados, importación/exportación y ramas paralelas de conversación.
---

## Los personajes se versionan

Editar un personaje crea una versión nueva en vez de sobrescribir la anterior.
Así se conserva el historial de la descripción, el saludo, las tarjetas y la
imagen. Podés revisar y volver a una versión anterior desde la pantalla del
personaje.

Un personaje puede incluir:

- Nombre, descripción y saludo.
- Tarjetas de personalidad o instrucciones.
- Una imagen de perfil recortada en la app.
- Una plantilla de ajustes independiente.

## Importar y exportar

Los personajes se pueden exportar como JSON versionado e importar en otro
ordenador. La exportación puede incluir las conversaciones, las imágenes y los
ajustes; el diálogo de importación te dice qué se va a crear.

Usalo para mover un personaje entre máquinas o para tener una copia portátil.

## Ramas

Una rama empieza en un mensaje y hereda los ajustes de la conversación. Usala
cuando una escena podría ir en dos direcciones y querés conservar las dos.

1. Abrí el mensaje donde debe empezar la rama.
2. Elegí **Crear rama**.
3. Continuá la escena en la rama nueva.

La conversación original no se modifica. Las ramas son historias separadas, así
que podés comparar resultados sin perder ninguno.

## Rebobinar, editar y regenerar

Dentro de una conversación podés rebobinar a un mensaje anterior, editar un
mensaje o regenerar una respuesta. Estas acciones son locales: la app guarda el
nuevo estado en `data/` y no envía nada hasta que pedís una generación nueva.
