---
title: Glosario
description: Los términos que se usan en Roleplay Manager, la app y la documentación.
---

**Modelo**
: La IA que genera las respuestas. Puede ejecutarse en local (Ollama) o en un
servicio remoto compatible con OpenAI.

**Proveedor**
: La conexión a un modelo: una URL, un tipo y, si hace falta, una API key. Puedes
tener varios proveedores y elegir uno por conversación.

**Contexto**
: Todo lo que se envía al modelo para una respuesta: prompt del personaje,
memorias, resúmenes, mensajes recientes e instrucción actual. Tiene un límite
de tamaño medido en tokens.

**Token**
: Una unidad pequeña de texto que procesa el modelo. Los límites de contexto
suelen expresarse en tokens, no en palabras.

**Memoria**
: Un hecho que el personaje debería recordar entre mensajes. Las memorias se
pueden proponer automáticamente o aprobar manualmente y pueden decaer con el tiempo.

**Resumen**
: Una versión comprimida de mensajes antiguos que se mantiene en el prompt en
vez del texto completo. Ayuda a que las conversaciones largas entren en el
límite de contexto.

**Rama**
: Una conversación paralela que empieza en un mensaje y hereda los ajustes de la
original. Las dos historias quedan disponibles.

**Rebobinar**
: Volver la conversación a un mensaje anterior y continuar desde ahí.

**OOC**
: Fuera de personaje. Texto que no es la voz del personaje, normalmente entre
`//...//`, y se muestra como una píldora aparte.

**PWA**
: Un sitio instalado en la pantalla de inicio del teléfono con su propio icono y
ventana. Roleplay Manager la usa para el acceso desde el teléfono; no hay app
nativa.

**Paquete portátil**
: El ZIP o tarball que contiene la app, su runtime de Node, el lanzador y la
carpeta `data/`. No necesita instalador.
