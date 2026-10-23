---
title: Solución de problemas
description: Resuelve los problemas más comunes de instalación, conexión y inicio.
---

## La app no abre

- Revisa la ventana de consola o terminal por si hay un error.
- Entra a `http://localhost:3001` manualmente.
- Si el puerto 3001 está ocupado, cierra la otra app o inicia Roleplay Manager
  con otro `PORT`.

## SmartScreen de Windows

El lanzador no está firmado. Si lo descargaste desde la versión oficial de
GitHub, elige **Más información → Ejecutar de todas formas**. Es un paso único.

## Gatekeeper de macOS

Permite la app en **Ajustes del Sistema → Privacidad y seguridad**, o ejecuta
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

- **Ollama:** asegúrate de que Ollama esté en ejecución y de que la URL sea
  `http://localhost:11434`.
- **Compatible con OpenAI:** revisa la URL base, la API key y si el modelo está
  disponible para esa clave.
- Usa **Probar conexión** en **Sistema → Proveedores** antes de empezar un chat.

## Una respuesta ignora algo

Abre la vista previa del contexto de la conversación. Muestra el prompt del
personaje, las memorias, los resúmenes y los mensajes recientes que se enviarán
al modelo. Si falta el detalle, agrégalo a la descripción del personaje, a una
memoria o a la instrucción actual.

## ¿Dónde están los registros?

Abre **Sistema → Registro**. Puedes copiar el registro o descargarlo y adjuntarlo
a una incidencia de GitHub.

## ¿Sigues atascado?

Abre una incidencia con tu sistema operativo, la versión de la app, qué esperabas y
qué pasó. Incluye las líneas relevantes del registro y, si puedes, los pasos para
reproducirlo.
