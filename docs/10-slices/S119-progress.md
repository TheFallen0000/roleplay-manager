# S119 — Arranque en puerto ocupado y reinicio adjunto a la terminal

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Dos problemas del paquete portátil en Linux:

1. Al lanzar el `start.sh` con la app ya abierta, se iniciaba una segunda
   instancia que reintentaba el puerto 3001; el navegador podía abrir pestañas
   de más.
2. Tras actualizar y pulsar **Reiniciar ahora**, la app quedaba en segundo
   plano: cerrar la consola o pulsar Ctrl+C no la detenía.

## Causa

### Puerto

El launcher instalado no comprobaba si la app ya estaba corriendo. Arrancaba
otro backend en el mismo 3001, que entraba en `EADDRINUSE` y reintentaba 15
veces. Cada lanzamiento adicional del launcher podía acabar abriendo otra
pestaña si la segunda instancia llegaba a escuchar.

### Proceso en segundo plano

`ProcessRestarter` lanzaba el launcher con `detached: true` y
`stdio: "ignore"`. El proceso quedaba en su propia sesión, sin TTY:

```
PPID  ...  SID/PGID = PID  TTY ?  RM_NO_BROWSER=1
```

Por eso Ctrl+C y el cierre de la consola no le llegaban. Se confirmó en la
instalación real: el proceso que quedó tras actualizar a 1.56.1 tenía sesión
propia, `TTY ?` y `RM_NO_BROWSER=1`.

## Cambios

### Launcher del paquete

- Nuevo `scripts/launcher-port.mjs`, copiado dentro de
  `versions/<version>/app/` (no añade archivos raíz, así el updater de 1.56.1
  sigue aceptando el paquete).
- Consulta `GET /api/health` en el puerto solicitado:
  - si responde nuestra app, imprime `running <puerto>`, abre esa URL una sola
    vez y termina;
  - si el puerto está libre, imprime `free <puerto>`;
  - si está ocupado por otra aplicación y el puerto es el 3001 por defecto,
    prueba el siguiente libre;
  - si `PORT` se puso explícitamente y está ocupado, imprime un error claro y
    termina con código 1.
- `start.sh` y `start.cmd` usan el helper antes de arrancar y actualizan
  `PORT`, `PUBLIC_API_URL`, `TUNNEL_TARGET_URL` y `RM_OPEN_BROWSER` con el
  puerto elegido.

### Reinicio

- En POSIX, `ProcessRestarter` usa `process.execve` para sustituir el proceso
  del servidor por el launcher: mismo PID, sesión, TTY y grupo de procesos.
- En Windows, lanza el launcher con `detached: false` y `stdio: "inherit"`.
- Si `execve` no está disponible o falla, cae al spawn adjunto.
- El navegador sigue sin reabrirse: `RM_NO_BROWSER=1` y se elimina
  `RM_OPEN_BROWSER` del entorno heredado.

## Decisiones

- **Abrir la instancia existente**: evita la segunda instancia, el bucle de
  `EADDRINUSE` y las pestañas repetidas.
- **Auto-siguiente solo con el puerto por defecto**: un `PORT` explícito puede
  responder a un túnel, firewall o costumbre del usuario; moverlo en silencio
  rompería esa expectativa, así que falla con un mensaje claro.
- **Helper dentro de la versión**: un archivo raíz nuevo sería rechazado por
  el updater de 1.56.1; dentro de `versions/<version>/app/` la lista blanca ya
  lo acepta.
- **`execve` antes que spawn**: conserva el PID y la relación con la terminal,
  que es justo lo que fallaba. En Windows no existe `execve`, así que se usa un
  hijo adjunto al mismo console.
- **Sin cambios de UI**: el flujo de actualización de S117 ya muestra el
  estado; este slice corrige el arranque y el proceso.

## Criterios de aceptación

- [x] El launcher detecta una instancia existente y sale sin arrancar otra.
- [x] El 3001 por defecto ocupado por otra app usa el siguiente libre.
- [x] Un `PORT` explícito ocupado falla con un mensaje claro.
- [x] El helper se empaqueta dentro del árbol de la versión.
- [x] El reinicio POSIX conserva PID/sesión/TTY y Ctrl+C lo detiene.
- [x] El reinicio Windows usa un proceso adjunto.
- [x] Tests del restarter, `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` actualizado.

## Verificación

- Helper aislado:
  - 3101 ocupado + explícito 0 → `free 3102`.
  - 3101 ocupado + explícito 1 → error claro.
  - app real en 3001 → `running 3001`.
- Launcher empaquetado:
  - con la app real en 3001 → “already running”, salida 0, sin segunda
    instancia;
  - `PORT=3101` ocupado → salida 1 con el mensaje.
- Reinicio real del paquete: PID **136436** antes y después, health en 3202
  tras el reinicio, `SIGINT` detiene el proceso.
- Backend: **672** tests (114 archivos); frontend: **351** tests (58 archivos).
- `pnpm check` y `pnpm build` en verde.
- **Pendiente**: dry run del workflow de release en la rama para revisar el
  `start.cmd` empaquetado en Windows.

## Nota de transición

El proceso que está corriendo ahora en la máquina del usuario fue lanzado por
el restarter **antiguo** de 1.56.1, así que sigue detachado. Hay que pararlo
una vez (`kill <PID>`) y arrancar el paquete nuevo desde una terminal; a partir
de ahí los reinicios conservan la sesión.

## Commits

1. `feat(packaging): detect an existing instance and attach restarts`
2. `docs(slice): document S119 launcher ports and restart`
