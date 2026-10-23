---
title: Proveedores de IA
description: Conectá Ollama o cualquier endpoint compatible con OpenAI y elegí un modelo.
---

Roleplay Manager no incluye un modelo. Se conecta al proveedor que elijas y le
envía el prompt.

## Ollama (local)

1. Instalá [Ollama](https://ollama.com/) y descargá un modelo, por ejemplo
   `ollama pull llama3.1`.
2. En Roleplay Manager, abrí **Sistema → Proveedores**.
3. Añadí `http://localhost:11434` como proveedor de Ollama.
4. Usá **Probar conexión**, guardá y elegí el modelo por defecto.

Todo se queda en tu ordenador. El rendimiento depende de tu hardware; un modelo
más chico es un buen punto de partida si no tenés una GPU dedicada.

## Endpoint compatible con OpenAI

1. Abrí **Sistema → Proveedores**.
2. Añadí un proveedor compatible con OpenAI con su URL base y su API key.
3. Probá la conexión y elegí un modelo.

Funciona con LM Studio, OpenRouter, una pasarela autoalojada o cualquier otro
servicio que implemente la API de chat de OpenAI.

:::note
Si usás un proveedor remoto, solo sale de tu equipo el prompt que enviás. Los
términos y la privacidad de ese proveedor se aplican a esa petición.
:::

## Modelos por conversación

El modelo por defecto se usa para los chats nuevos, pero cada conversación puede
usar un proveedor y un modelo distintos. Abrí los ajustes de la conversación
para cambiarlo sin afectar al resto.

## Solución de problemas

- **Conexión rechazada con Ollama:** asegurate de que Ollama esté corriendo y de
  que la URL sea `http://localhost:11434`.
- **401 o 403:** revisá la API key y la URL base del proveedor.
- **El modelo no aparece:** refrescá la lista después de descargarlo o
  habilitarlo en el proveedor.
