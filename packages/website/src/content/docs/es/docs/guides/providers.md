---
title: Proveedores de IA
description: Conecta Ollama o cualquier endpoint compatible con OpenAI y elige un modelo.
---

Roleplay Manager no incluye un modelo. Se conecta al proveedor que elijas y le
envía el prompt.

## Ollama (local)

1. Instala [Ollama](https://ollama.com/) y descarga un modelo, por ejemplo
   `ollama pull llama3.1`.
2. En Roleplay Manager, abre **Sistema → Proveedores**.
3. Añade `http://localhost:11434` como proveedor de Ollama.
4. Usa **Probar conexión**, guarda y elige el modelo por defecto.

Todo se queda en tu equipo. El rendimiento depende de tu hardware; un modelo
más pequeño es un buen punto de partida si no tienes una GPU dedicada.

## Endpoint compatible con OpenAI

1. Abre **Sistema → Proveedores**.
2. Añade un proveedor compatible con OpenAI con su URL base y su API key.
3. Prueba la conexión y elige un modelo.

Funciona con LM Studio, OpenRouter, una pasarela autoalojada o cualquier otro
servicio que implemente la API de chat de OpenAI.

:::note
Si usas un proveedor remoto, solo sale de tu equipo el prompt que envías. Los
términos y la privacidad de ese proveedor se aplican a esa petición.
:::

## Modelos por conversación

El modelo por defecto se usa para los chats nuevos, pero cada conversación puede
usar un proveedor y un modelo distintos. Abre los ajustes de la conversación
para cambiarlo sin afectar al resto.

## Solución de problemas

- **Conexión rechazada con Ollama:** asegúrate de que Ollama esté en ejecución y de
  que la URL sea `http://localhost:11434`.
- **401 o 403:** revisa la API key y la URL base del proveedor.
- **El modelo no aparece:** actualiza la lista después de descargarlo o
  habilitarlo en el proveedor.
