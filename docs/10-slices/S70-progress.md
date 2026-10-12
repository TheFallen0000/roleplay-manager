# S70 — Memorias agrupadas por actor con buscador

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

La lista de memorias era una cascada plana dentro de un contenedor con scroll:
con varias memorias y actores no se veía de un vistazo *quién* sabe *qué*. Ahora
se agrupan por actor en secciones colapsables (con contador y estado recordado
por conversación) y hay un buscador que filtra y expande los grupos con
coincidencias.

## Decisiones

- **Secciones colapsables** (elegido) reutilizando el `Accordion` de la app y
  `usePersistedStringList` para recordar las aperturas (`memory-groups`).
- **Orden**: primero el personaje de la conversación, luego por número de
  memorias (empate: alfabético); dentro del grupo, prioridad efectiva
  descendente (con el decay aplicado, el mismo número que muestra la insignia).
- **Buscador**: filtra por actor, título y descripción (sin distinguir
  mayúsculas); mientras hay búsqueda, la expansión sigue a las coincidencias y
  no se persiste (al limpiarla, vuelve el estado guardado).
- **Cabecera por actor**: avatar con la inicial, nombre, distintivos
  **Personaje** (la IA de la conversación) y **Tú** (tu personaje jugado,
  resuelto con `listPlayerCharacters` + `playerCharacterId`; si la consulta
  falla, el actor queda sin distintivo) y el contador.
- **Card más compacta**: el actor ya no se repite dentro del grupo y la insignia
  de prioridad encabeza la card.
- **Resumen de la sección**: «N memorias · M actores» + botón de crear + la nota
  del último decay.
- Helper puro `groupMemoriesByActor` (testeable por separado) y test de
  componente nuevo para la lista.

## Criterios de aceptación

- [x] Memorias agrupadas por actor, colapsables, con contador y estado
      persistido por conversación.
- [x] Orden pedido (personaje primero; grupos y memorias por relevancia).
- [x] Buscador que filtra y auto-expande, sin pisar el estado guardado.
- [x] Distintivos «Personaje» y «Tú» cuando se pueden resolver.
- [x] Gates + tests + build + smoke en verde; PR con CI verde y release v1.43.0.

## Verificación

- Tests nuevos: helper de agrupación (4 casos) y lista de memorias (4: resumen y
  grupos, expandir, búsqueda, sin resultados) → frontend **285** tests.
- E2E con el paquete empaquetado: 3 grupos renderizados (Lyra, Auron, Marcus),
  distintivos «Personaje» y «Tú», colapsadas por defecto, al expandir se ven
  las cards y la búsqueda «poción» deja solo el grupo con la coincidencia
  (capturas revisadas).
- Nota: el primer intento del E2E falló por un bug del *seeding* de la prueba
  (fixtures escritos en ASCII convertían «Poción» en «Poci?n»), no de la app.

## Commits

1. `feat(frontend): group the memories by actor with a search box`
2. `docs(slice): add S70 progress`
3. `release: bump to v1.43.0 and add changelog entry`
