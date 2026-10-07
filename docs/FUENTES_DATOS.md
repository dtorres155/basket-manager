# Fuentes de los datos

Consultadas en octubre de 2026. Los scripts guardan lo descargado en `recursos/` (no se sube al repositorio) y `node tools/generar_plantillas.js` lo convierte en `datos_ligas3.js`.

| Liga | Fuente | Script | Qué da |
|---|---|---|---|
| ACB | acb.com (plantilla y ficha de cada jugador) | `tools/plantillas_acb.js` | nombre, posición, nacionalidad, nacimiento |
| Lega | legabasket.it (API pública de su web) | `tools/plantillas_lba_gbl.js` | nombre, posición, nacionalidad, nacimiento, altura, fin de contrato, entrenador |
| GBL | esake.gr (ficha de cada club) | `tools/plantillas_lba_gbl.js` | nombre, posición, nacionalidad, nacimiento, altura |
| BBL, Euroliga, EuroCup | sportschau.de (convocatorias de la jornada) | `tools/plantillas_sportschau.js` | nombre, base/alero/pívot, nacionalidad, nacimiento, cuerpo técnico |
| Clubes y pabellones | Wikipedia (páginas de cada liga 2026-27) | a mano | lista de clubes, ascensos y descensos |
| Fechas | Euroliga, EuroCup y ACB: calendarios oficiales publicados en verano de 2026 | a mano | inicio, Final Four, Copa del Rey, playoffs |

Sin fuente abierta: la liga turca (tbf.org.tr está protegido por Cloudflare y no se ha intentado saltar). Sus clubes, salvo Fenerbahçe, Efes, Beşiktaş y los tres de la EuroCup, siguen con relleno.

**Estimado, no real:** valoración, potencial, perfil de juego, salario y fin de contrato (salvo en la Lega). La media de los 8 mejores de cada club se fija por su reputación y liga; los extranjeros suben, los menores de 23 bajan y tienen más potencial. Si un jugador ya estaba en los datos con valoración hecha a mano en el mismo club, se conserva.
