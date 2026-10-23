---
title: ¿Qué es Roleplay Manager?
description: Un cuaderno local-first para conversaciones de rol largas con personajes de IA.
---

Roleplay Manager es una app autoalojada para conversaciones de rol largas con
personajes de IA. Se ejecuta en tu ordenador, guarda tu historia en una base
SQLite local y se conecta al proveedor de IA que elijas.

## Las tres promesas

- **Local-first.** Personajes, chats, memorias, resúmenes e imágenes viven en
  `data/` dentro de la carpeta de la app. No hay cuenta ni servicio en la nube
  nuestro.
- **Continuidad.** Los personajes se versionan, la memoria puede decaer, los
  resúmenes mantienen los chats largos dentro del contexto del modelo y las
  ramas te dejan explorar otra dirección sin perder la original.
- **Tu proveedor.** Ejecutá Ollama en la misma máquina o conectá cualquier
  endpoint compatible con OpenAI con tu propia clave. La app no te encierra en
  un solo modelo.

## Qué necesitás

- Un equipo Windows, Linux o macOS de 64 bits.
- Unos 200 MB de espacio libre después de descomprimir.
- Un proveedor de IA. Ollama es la opción local más simple; un endpoint remoto
  compatible con OpenAI también funciona.

## Qué no es

- No es un servicio alojado. No hay login ni datos guardados en nuestros
  servidores.
- No es una app móvil nativa. El teléfono abre la app que corre en tu ordenador
  mediante Tailscale o tu red doméstica.
- No es un modelo. Es el cuaderno alrededor del modelo; vos elegís qué modelo
  usar.

:::note
Si usás un proveedor remoto, el prompt que enviás sale de tu equipo y va a ese
proveedor. Si usás Ollama en local, la inferencia se queda en tu máquina.
:::

Siguiente: [instalar Roleplay Manager](/es/docs/getting-started/installation/windows/).
