# Fuentes de los datos

Consultadas en octubre de 2026. Los scripts guardan lo descargado en `recursos/` (no se sube al repositorio) y `node tools/generar_plantillas.js` lo convierte en `datos_ligas3.js`.

| Liga | Fuente | Script | Qué da |
|---|---|---|---|
| ACB | acb.com (plantilla y ficha de cada jugador) | `tools/plantillas_acb.js` | nombre, posición, nacionalidad, nacimiento |
| Lega | legabasket.it (API pública de su web) | `tools/plantillas_lba_gbl.js` | nombre, posición, nacionalidad, nacimiento, altura, fin de contrato, entrenador |
| GBL | esake.gr (ficha de cada club) | `tools/plantillas_lba_gbl.js` | nombre, posición, nacionalidad, nacimiento, altura |
| BBL, Euroliga, EuroCup | sportschau.de (convocatorias de la jornada) | `tools/plantillas_sportschau.js` | nombre, base/alero/pívot, nacionalidad, nacimiento, cuerpo técnico |
| BSL | Wikipedia en inglés (plantillas «current roster» y fichas de los jugadores, API) | `tools/plantillas_bsl_wiki.js` | nombre, posición, nacionalidad o país de nacimiento, nacimiento, altura |
| Clubes y pabellones | Wikipedia (páginas de cada liga 2026-27) | a mano | lista de clubes, ascensos y descensos |
| Fechas | Euroliga, EuroCup y ACB: calendarios oficiales publicados en verano de 2026 | a mano | inicio, Final Four, Copa del Rey, playoffs |

La web de la federación turca (tbf.org.tr) y RealGM están protegidas por Cloudflare y no se ha intentado saltarlas. Çayırova (campeón de la segunda división turca en 2025-26) no tiene plantilla en la Wikipedia: se toma la de Flashscore (https://www.flashscore.com.tr/takim/cayirova/4hgsd1tk/kadro/, octubre de 2026) sin Fabian White, que se fue en junio; sus posiciones, alturas y fechas de nacimiento son estimadas. Su pabellón, aforo y colores son reales (Wikipedia en turco); los jugadores sin artículo en la Wikipedia (sobre todo jóvenes turcos) llevan edad y posición estimadas.

**Estimado, no real:** valoración, potencial, perfil de juego, salario y fin de contrato (salvo en la Lega). La media de los 8 mejores de cada club se fija por su reputación y liga; los extranjeros suben, los menores de 23 bajan y tienen más potencial. Si un jugador ya estaba en los datos con valoración hecha a mano en el mismo club, se conserva.

## Estadísticas de 2025-26 (valoraciones)

| Competición | Fuente | Qué se usa |
|---|---|---|
| NBA | Basketball-Reference, medias por partido (https://www.basketball-reference.com/leagues/NBA_2026_per_game.html) | Game Score por partido |
| Euroliga y EuroCup | API pública de la Euroliga (api-live.euroleague.net, estadísticas tradicionales por partido, temporadas E2025 y U2025) | PIR por partido |

Se descargan una vez (2 s entre peticiones) en `recursos/stats_2026/`. Cada jugador con muestra suficiente se reordena dentro de su competición por su producción y se mezcla con la valoración estimada según partidos y minutos (cambio máximo ±8).
