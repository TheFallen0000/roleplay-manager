---
title: Personajes y ramas
description: Personajes versionados, importación/exportación y ramas paralelas de conversación.
---

## Los personajes se versionan

Editar un personaje crea una versión nueva en vez de sobrescribir la anterior.
Así se conserva el historial de la descripción, el saludo, las tarjetas y la
imagen. Puedes revisar y volver a una versión anterior desde la pantalla del
personaje.

Un personaje puede incluir:

- Nombre, descripción y saludo.
- Tarjetas de personalidad o instrucciones.
- Una imagen de perfil recortada en la app.
- Una plantilla de ajustes independiente.

## Importar y exportar

Los personajes se pueden exportar como JSON versionado e importar en otro
equipo. La exportación puede incluir las conversaciones, las imágenes y los
ajustes; el diálogo de importación te dice qué se va a crear.

Úsalo para mover un personaje entre máquinas o para tener una copia portátil.

## Cartas y lorebooks compatibles con SillyTavern

También puedes importar cartas de personaje de SillyTavern (V1, V2 y V3) desde
JSON o PNG. Si un PNG contiene los chunks `chara` y `ccv3`, se usa la carta V3.
La app conserva los campos que no interpreta para que volver a exportar la
carta no los pierda en silencio. Puedes importar lorebooks embebidos en una
carta, archivos standalone `lorebook_v3` y lorebooks de SillyTavern con
`{ entries }`, y vincularlos a un personaje. La activación soportada cubre
claves, claves secundarias, lógica selectiva, entradas constantes, orden,
posición, mayúsculas, palabras completas, profundidad de escaneo y presupuesto
de tokens. Las funciones avanzadas de lorebook se preservan, pero no se
activan.

La exportación está disponible en JSON y PNG V2 o V3, escribiendo los chunks
`chara` y `ccv3`. «Compatible con SillyTavern» es una descripción nominativa de
los formatos; se trata de una implementación clean-room basada en las
especificaciones públicas, sin copiar código, interfaz, prompts, assets ni tests
de SillyTavern y sin insinuar respaldo alguno.

## Ramas

Una rama empieza en un mensaje y hereda los ajustes de la conversación. Úsala
cuando una escena podría ir en dos direcciones y quieres conservar las dos.

1. Abre el mensaje donde debe empezar la rama.
2. Elige **Crear rama**.
3. Sigue la escena en la rama nueva.

La conversación original no se modifica. Las ramas son historias separadas, así
que puedes comparar resultados sin perder ninguno.

## Rebobinar, editar y regenerar

Dentro de una conversación puedes rebobinar a un mensaje anterior, editar un
mensaje o regenerar una respuesta. Estas acciones son locales: la app guarda el
nuevo estado en `data/` y no envía nada hasta que pides una generación nueva.
