---
title: Solución de problemas
description: Resolvé los problemas más comunes de instalación, conexión y arranque.
---

## La app no abre

- Revisá la ventana de consola o terminal por si hay un error.
- Entrá a `http://localhost:3001` a mano.
- Si el puerto 3001 está ocupado, cerrá la otra app o arrancá Roleplay Manager
  con otro `PORT`.

## SmartScreen de Windows

El lanzador no está firmado. Si lo descargaste desde la release oficial de
GitHub, elegí **Más información → Ejecutar de todas formas**. Es un paso único.

## Gatekeeper de macOS

Permití la app en **Ajustes del Sistema → Privacidad y seguridad**, o ejecutá
esto dentro de la carpeta de la app:

```bash
xattr -dr com.apple.quarantine .
```

## Lanzador de Linux

Si `./start.sh` no se ejecuta:

```bash
chmod +x start.sh
```

## La conexión con el proveedor falla

- **Ollama:** asegurate de que Ollama esté corriendo y de que la URL sea
  `http://localhost:11434`.
- **Compatible con OpenAI:** revisá la URL base, la API key y si el modelo está
  disponible para esa clave.
- Usá **Probar conexión** en **Sistema → Proveedores** antes de empezar un chat.

## Una respuesta ignora algo

Abrí la vista previa del contexto de la conversación. Muestra el prompt del
personaje, las memorias, los resúmenes y los mensajes recientes que se enviarán
al modelo. Si falta el detalle, agregalo a la descripción del personaje, a una
memoria o a la instrucción actual.

## ¿Dónde están los registros?

Abrí **Sistema → Registro**. Podés copiar el registro o descargarlo y adjuntarlo
a un issue de GitHub.

## ¿Seguís atascado?

Abrí un issue con tu sistema operativo, la versión de la app, qué esperabas y
qué pasó. Incluí las líneas relevantes del registro y, si podés, los pasos para
reproducirlo.
