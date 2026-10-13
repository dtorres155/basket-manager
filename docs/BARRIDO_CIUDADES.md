# Barrido de ciudades

Nota: las 20 ciudades marcadas con «carga lenta» se midieron con las descargas OSM corriendo a la vez; a solas (Trabzonspor, Karditsa) cargan en 11 s. Avisos reales: Manresa (sin calles con nombre ni concesionario), San Antonio (4 calles, metro), Mykonos (2 calles), pabellón lejos en Clippers y Türk Telekom.

Generado el 2026-10-13 con `node tools/barrido_ciudades.js`. Abre cada club en la ciudad real y comprueba datos, edificios, calles, plazas, relieve, transporte, tipologías, errores y tiempo de carga. 96 de 120 ciudades sin ningún aviso. Medias: 163 edificios, 50 calles con nombre, 3 plazas, carga de 20.5 s.

Revisadas a mano (vistas en `capturas/barrido/`, fuera de git): leyma-coruna, tenerife, charlotte-hornets, iraklis, galatasaray, portland-trail-blazers, real-madrid, karditsa, detroit-pistons, boston-celtics.

| Ciudad | País | Edificios | Calles | Plazas | Tipologías | Tranvía | Bus | Vecinos | Carga (s) | Avisos |
|---|---|---|---|---|---|---|---|---|---|---|
| atlanta-hawks | US | 54 | 21 | 4 | 7 | 13 |  | 137797 | 13.3 | ninguno |
| boston-celtics | US | 95 | 67 | 3 | 7 | 28 | 354 | 88627 | 2.5 | ninguno |
| brooklyn-nets | US | 445 | 77 | 4 | 7 | 0 |  | 127279 | 3.8 | ninguno |
| charlotte-hornets | US | 55 | 65 | 3 | 7 | 32 | 27 | 83188 | 1.9 | ninguno |
| chicago-bulls | US | 63 | 35 | 6 | 6 | 39 | 50 | 26549 | 2.6 | ninguno |
| cleveland-cavaliers | US | 78 | 38 | 1 | 7 | 37 | 251 | 101649 | 9.4 | ninguno |
| detroit-pistons | US | 92 | 57 | 3 | 6 | 12 | 461 | 63750 | 9.6 | ninguno |
| indiana-pacers | US | 84 | 76 | 1 | 6 | 0 | 90 | 82401 | 5.9 | ninguno |
| miami-heat | US | 77 | 42 | 2 | 7 | 4 |  | 119275 | 1.9 | ninguno |
| milwaukee-bucks | US | 70 | 115 | 2 | 7 | 5 |  | 76604 | 2.4 | ninguno |
| new-york-knicks | US | 211 | 43 | 1 | 7 | 0 | X22A | 388063 | 4.4 | ninguno |
| orlando-magic | US | 92 | 40 | 3 | 7 | 0 |  | 67969 | 3.9 | ninguno |
| philadelphia-76ers | US | 86 | 22 | 2 | 5 | 0 | 17 | 13878 | 2.2 | ninguno |
| toronto-raptors | US | 55 | 75 | 2 | 7 | 0 |  | 150013 | 2.0 | ninguno |
| washington-wizards | US | 146 | 65 | 3 | 6 | 0 | D4X | 136532 | 2.2 | ninguno |
| dallas-mavericks | US | 71 | 52 | 2 | 7 | 31 |  | 47291 | 1.8 | ninguno |
| denver-nuggets | US | 95 | 50 | 2 | 6 | 58 |  | 77365 | 1.7 | ninguno |
| golden-state-warriors | US | 52 | 40 | 6 | 7 | 8 | Transbay | 32075 | 1.5 | ninguno |
| houston-rockets | US | 42 | 58 | 2 | 6 | 11 | Green | 63422 | 2.8 | ninguno |
| los-angeles-clippers | US | 153 | 40 | 2 | 6 | 0 | Lennox | 37915 | 2.4 | pabellón lejos (141 m) |
| los-angeles-lakers | US | 50 | 49 | 2 | 7 | 5 | 30 | 184411 | 2.0 | ninguno |
| memphis-grizzlies | US | 105 | 45 | 3 | 6 | 37 | 12 | 56972 | 1.8 | ninguno |
| minnesota-timberwolves | US | 71 | 71 | 3 | 7 | 43 | 5 | 131741 | 2.3 | ninguno |
| new-orleans-pelicans | US | 76 | 31 | 2 | 7 | 12 | 102 | 98782 | 1.9 | ninguno |
| oklahoma-city-thunder | US | 72 | 76 | 2 | 7 | 25 | 11 | 26680 | 1.5 | ninguno |
| phoenix-suns | US | 94 | 46 | 2 | 7 | 0 | 451 | 94954 | 3.6 | ninguno |
| portland-trail-blazers | US | 71 | 70 | 2 | 6 | 0 |  | 45325 | 8.9 | ninguno |
| sacramento-kings | US | 83 | 57 | 3 | 7 | 0 | 42B | 76405 | 2.4 | ninguno |
| san-antonio-spurs | US | 109 | 4 | 2 | 6 | 0 | 24 | 27633 | 1.6 | pocas calles con nombre; metro < 2 |
| utah-jazz | US | 81 | 50 | 4 | 7 | 31 | 205 | 33505 | 1.4 | ninguno |
| real-madrid | ES | 194 | 69 | 2 | 6 | 0 |  | 94175 | 2.3 | ninguno |
| fc-barcelona | ES | 101 | 52 | 2 | 6 | 7 | 101 | 79321 | 7.2 | ninguno |
| olympiacos | GR | 50 | 16 | 2 | 6 | 32 | Β1 | 35969 | 1.9 | ninguno |
| panathinaikos | GR | 294 | 84 | 3 | 6 | 23 | 209 | 82336 | 2.7 | ninguno |
| fenerbahce | TR | 91 | 36 | 2 | 7 | 0 |  | 73607 | 1.7 | ninguno |
| anadolu-efes | TR | 84 | 13 | 2 | 6 | 6 | HVL-4 | 45350 | 1.6 | ninguno |
| besiktas | TR | 348 | 88 | 3 | 6 | 6 |  | 53712 | 6.9 | ninguno |
| baskonia | ES | 45 | 12 | 2 | 6 | 0 | E3 | 30845 | 9.4 | ninguno |
| maccabi-tel-aviv | IL | 123 | 54 | 1 | 7 | 0 | 104 | 78955 | 7.5 | ninguno |
| hapoel-tel-aviv | IL | 74 | 12 | 3 | 6 | 0 | 909 | 16454 | 4.0 | ninguno |
| zalgiris-kaunas | LT | 53 | 10 | 1 | 6 | 0 | 106 | 22652 | 4.9 | ninguno |
| crvena-zvezda | RS | 101 | 34 | 3 | 7 | 7 | 33 | 57416 | 7.2 | ninguno |
| partizan | RS | 135 | 85 | 3 | 6 | 9 | A1 | 49121 | 1.8 | ninguno |
| virtus-bologna | IT | 649 | 127 | 8 | 7 | 0 | 30 | 79980 | 11.1 | ninguno |
| olimpia-milano | IT | 88 | 15 | 2 | 6 | 14 |  | 22107 | 8.9 | ninguno |
| bayern-munich | DE | 56 | 39 | 2 | 5 | 27 |  | 45523 | 2.3 | ninguno |
| valencia-basket | ES | 81 | 41 | 1 | 7 | 0 | 99 | 49231 | 9.2 | ninguno |
| paris-basketball | FR | 100 | 65 | 3 | 7 | 13 | N43 | 50491 | 10.6 | ninguno |
| asvel | FR | 47 | 19 | 3 | 6 | 64 | 85 | 20071 | 3.3 | ninguno |
| dubai-basketball | AE | 98 | 29 | 2 | 7 | 2 |  | 85503 | 2.5 | ninguno |
| unicaja | ES | 68 | 26 | 2 | 6 | 0 |  | 20360 | 2.0 | ninguno |
| joventut-badalona | ES | 93 | 85 | 3 | 6 | 8 | N11 | 80634 | 3.3 | ninguno |
| leyma-coruna | ES | 87 | 61 | 3 | 7 | 0 |  | 29607 | 3.1 | ninguno |
| tenerife | ES | 98 | 24 | 3 | 6 | 31 |  | 55919 | 6.0 | ninguno |
| ucam-murcia | ES | 130 | 33 | 3 | 6 | 0 | R20 | 45629 | 2.5 | ninguno |
| bilbao-basket | ES | 66 | 62 | 3 | 6 | 37 | 85 | 68195 | 2.6 | ninguno |
| girona | ES | 76 | 71 | 3 | 6 | 0 | L0577 | 5015 | 1.4 | ninguno |
| zaragoza | ES | 95 | 43 | 3 | 6 | 0 | N6 | 40514 | 2.8 | ninguno |
| manresa | ES | 77 |  | 3 | 6 | 0 | L4 | 29644 | 1.9 | pocas calles con nombre; sin concesionario |
| andorra | AD | 132 | 68 | 5 | 6 | 0 | L1 | 27094 | 2.3 | ninguno |
| hiopos-lleida | ES | 148 | 103 | 6 | 6 | 0 | 70 | 62668 | 5.5 | ninguno |
| breogan | ES | 53 | 31 | 3 | 6 | 0 | 1.3 | 7441 | 2.0 | ninguno |
| burgos | ES | 67 | 67 | 2 | 6 | 0 | L10 | 34668 | 1.8 | ninguno |
| obradoiro | ES | 94 | 32 | 2 | 5 | 0 | 9 | 24097 | 1.7 | ninguno |
| reyer-venezia | IT | 104 | 23 | 3 | 6 | 0 | 13 | 16868 | 3.1 | ninguno |
| trento | IT | 86 | 17 | 4 | 6 | 0 | A/ | 31344 | 1.9 | ninguno |
| reggio-emilia | IT | 303 | 58 | 3 | 6 | 0 | E | 30924 | 10.4 | ninguno |
| napoli-basket | IT | 92 | 11 | 3 | 6 | 0 | C14 | 20590 | 8.2 | ninguno |
| trieste | IT | 162 | 35 | 5 | 6 | 0 | 52 | 37317 | 11.8 | ninguno |
| varese | IT | 107 | 35 | 3 | 6 | 0 |  | 21287 | 8.9 | ninguno |
| treviso | IT | 117 | 8 | 3 | 6 | 0 | 1 | 18918 | 14.2 | ninguno |
| tortona | IT | 390 | 109 | 0 | 6 | 0 |  | 52030 | 27.2 | ninguno |
| cantu | IT | 94 | 21 | 3 | 6 | 0 |  | 23282 | 26.6 | ninguno |
| udine | IT | 141 | 72 | 7 | 6 | 0 | F | 11425 | 29.9 | ninguno |
| bc-roma | IT | 116 | 68 | 8 | 6 | 17 | 30 | 46230 | 40.6 | carga lenta |
| maxima-roma | IT | 66 | 29 | 5 | 6 | 0 | 778 | 35720 | 24.0 | ninguno |
| scafati | IT | 118 | 7 | 4 | 6 | 0 |  | 11021 | 26.3 | ninguno |
| verona | IT | 191 | 36 | 3 | 6 | 0 |  | 58719 | 38.5 | ninguno |
| aek-atenas | GR | 294 | 83 | 2 | 6 | 23 | 209 | 82205 | 34.2 | ninguno |
| paok | GR | 333 | 103 | 4 | 6 | 0 | 14 | 74598 | 49.6 | carga lenta |
| aris | GR | 117 | 39 | 3 | 6 | 0 | 28 | 60981 | 32.6 | ninguno |
| peristeri | GR | 543 | 87 | 3 | 6 | 0 | 706 | 90410 | 45.7 | carga lenta |
| promitheas | GR | 726 | 43 | 2 | 6 | 0 | 3 | 45239 | 65.6 | carga lenta |
| kolossos | GR | 298 | 64 | 3 | 6 | 0 |  | 24010 | 38.7 | ninguno |
| maroussi | GR | 294 | 84 | 3 | 6 | 23 | 209 | 82249 | 29.5 | ninguno |
| karditsa | GR | 644 | 65 | 2 | 6 | 0 |  | 36361 | 85.7 | carga lenta |
| vikos | GR | 281 | 61 | 8 | 6 | 0 |  | 32926 | 36.8 | ninguno |
| doxa-lefkadas | GR | 1013 | 36 | 2 | 6 | 0 |  | 25249 | 63.8 | carga lenta |
| iraklis | GR | 333 | 103 | 3 | 6 | 0 | 14 | 74651 | 44.9 | carga lenta |
| mykonos | GR | 128 | 2 | 3 | 6 | 0 |  | 2194 | 34.1 | pocas calles con nombre |
| alba-berlin | DE | 67 | 60 | 2 | 6 | 184 | 300 | 58930 | 37.0 | ninguno |
| ulm | DE | 102 | 37 | 1 | 6 | 0 | 72 | 20366 | 30.3 | ninguno |
| ludwigsburg | DE | 224 | 71 | 3 | 6 | 0 | 534 | 50737 | 40.3 | carga lenta |
| bamberg | DE | 141 | 37 | 2 | 6 | 0 | 970 | 9684 | 29.6 | ninguno |
| bonn | DE | 135 | 60 | 2 | 6 | 0 | 843 | 22190 | 34.3 | ninguno |
| frankfurt | DE | 103 | 11 | 4 | 6 | 0 | M55 | 25046 | 33.1 | ninguno |
| hamburg | DE | 96 | 17 | 2 | 6 | 0 | 152 | 21077 | 36.5 | ninguno |
| oldenburg | DE | 131 | 28 | 3 | 6 | 0 | 322 | 43089 | 41.9 | carga lenta |
| wuerzburg | DE | 119 | 47 | 3 | 7 | 0 |  | 30224 | 35.9 | ninguno |
| chemnitz | DE | 103 | 21 | 3 | 6 | 23 | 43 | 30140 | 29.4 | ninguno |
| weissenfels | DE | 119 | 26 | 3 | 6 | 0 |  | 26635 | 30.6 | ninguno |
| vechta | DE | 90 | 11 | 3 | 6 | 0 |  | 19849 | 25.5 | ninguno |
| jena | DE | 118 | 16 | 3 | 6 | 96 | 481 | 10463 | 31.5 | ninguno |
| rostock | DE | 56 | 75 | 3 | 6 | 0 | 26 | 34710 | 51.6 | carga lenta |
| hagen | DE | 109 | 29 | 3 | 6 | 0 | 525 | 16894 | 37.4 | ninguno |
| trier | DE | 98 | 41 | 3 | 7 | 0 | 1 | 26190 | 68.0 | carga lenta |
| braunschweig | DE | 100 | 93 | 3 | 6 | 0 | 431 | 52065 | 53.1 | carga lenta |
| galatasaray | TR | 348 | 88 | 3 | 6 | 6 |  | 53701 | 34.7 | ninguno |
| tofas | TR | 174 | 111 | 3 | 6 | 11 |  | 19070 | 60.6 | carga lenta |
| turk-telekom | TR | 230 | 41 | 2 | 7 | 0 | 261-6 | 76638 | 87.1 | pabellón lejos (195 m); carga lenta |
| bahcesehir | TR | 348 | 88 | 3 | 6 | 6 |  | 53722 | 36.8 | ninguno |
| karsiyaka | TR | 97 | 21 | 2 | 6 | 36 | 445 | 47278 | 34.9 | ninguno |
| merkezefendi | TR | 217 | 54 | 3 | 6 | 0 |  | 20083 | 31.9 | ninguno |
| aliaga | TR | 329 | 54 | 1 | 6 | 0 |  | 39783 | 39.7 | ninguno |
| bursaspor | TR | 188 | 111 | 3 | 6 | 0 |  | 19219 | 48.1 | carga lenta |
| korfez | TR | 166 | 8 | 3 | 6 | 0 | 200 | 7466 | 72.4 | carga lenta |
| cayirova | TR | 176 | 10 | 3 | 6 | 0 |  | 13196 | 50.5 | carga lenta |
| bandirma | TR | 270 | 25 | 3 | 6 | 0 | 19 | 32981 | 79.6 | carga lenta |
| erokspor | TR | 348 | 88 | 3 | 6 | 6 |  | 53576 | 43.7 | carga lenta |
| trabzonspor | TR | 668 | 85 | 6 | 6 | 0 |  | 41943 | 107.2 | carga lenta |
