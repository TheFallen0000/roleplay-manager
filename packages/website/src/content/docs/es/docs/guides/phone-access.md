---
title: Acceso desde el teléfono
description: Abrí Roleplay Manager desde el teléfono con Tailscale o la WiFi doméstica e instalalo como PWA.
---

Roleplay Manager corre en tu ordenador. El teléfono es un cliente: abre la misma
app mediante una dirección privada. No hay una app móvil nativa que instalar.

## Tailscale (recomendado)

Tailscale crea una red privada entre tus dispositivos sin exponer puertos a
internet.

1. Instalá Tailscale en el ordenador y en el teléfono, e iniciá sesión en la
   misma tailnet.
2. En Roleplay Manager, abrí **Teléfono** y elegí **Tailscale**.
3. Escaneá el código QR o abrí la dirección
   `https://<equipo>.<tailnet>.ts.net` en el teléfono.

También podés activar el enlace al arrancar y cortarlo al cerrar la app. El
enlace se desactiva solo después de un período configurable sin actividad del
teléfono.

## WiFi doméstica (LAN)

Usalo cuando los dos dispositivos están en la misma red y no necesitás acceso
desde fuera.

1. Abrí **Teléfono** y elegí **Red doméstica (LAN)**.
2. Abrí la dirección `http://<ip-privada>:4322` en el teléfono.
3. Si no abre, revisá el firewall del ordenador y asegurate de que los dos
   dispositivos estén en la misma red.

## Instalalo como PWA

En Android (Chrome) usá **Instalar app** o **Agregar a la pantalla principal**.
En iPhone (Safari) usá **Compartir → Agregar a la pantalla de inicio**. La app
instalada se abre en su propia ventana y conserva su icono.

:::caution
Compartí la app solo en redes de confianza. Tailscale mantiene el acceso
privado; un enlace LAN es visible para los dispositivos de esa red.
:::
