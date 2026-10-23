---
title: Instalar en Linux y macOS
description: Descargá el paquete portátil para Linux o macOS, descomprimilo y ejecutá el lanzador.
---

## Antes de empezar

- Linux x64/arm64 o macOS Apple Silicon/Intel.
- Unos 200 MB de espacio libre después de descomprimir.
- Un proveedor de IA: Ollama en local o un endpoint compatible con OpenAI.

No necesitás Node.js, un instalador ni una cuenta.

## Linux

1. [Descargá el paquete de Linux](/es/download/) y descomprimilo en un sitio
   permanente.
2. Abrí una terminal en la carpeta y dale permiso al lanzador:

```bash
chmod +x start.sh
./start.sh
```

3. El navegador debería abrir `http://localhost:3001`.

Si el navegador no se abre, entrá a la URL a mano. Mantené la terminal abierta
mientras la app está corriendo.

## macOS

1. [Descargá el paquete de macOS](/es/download/) para Apple Silicon o Intel.
2. Descomprimilo y mové la carpeta a un lugar que recuerdes.
3. Abrí Terminal en la carpeta y ejecutá:

```bash
./start.sh
```

4. El navegador debería abrir `http://localhost:3001`.

:::caution[Gatekeeper puede bloquear el primer arranque]
El runtime de Node incluido no está firmado. Permití la app en **Ajustes del
Sistema → Privacidad y seguridad**, o ejecutá esto dentro de la carpeta:

```bash
xattr -dr com.apple.quarantine .
```

:::

## Después del primer arranque

Abrí **Sistema → Proveedores**, añadí Ollama o un endpoint compatible con OpenAI,
probá la conexión y elegí un modelo.

Siguiente: [conectar un proveedor](/es/docs/guides/providers) o
[primeros pasos](/es/docs/getting-started/first-steps).
