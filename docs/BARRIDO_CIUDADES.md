# Barrido de ciudades

Generado el 2026-10-14 con `node tools/barrido_ciudades.js`. Abre cada club en la ciudad real y comprueba datos, edificios, calles, plazas, relieve, transporte, tipologías, errores y tiempo de carga. 120 de 120 ciudades sin ningún aviso. Medias: 163 edificios, 50 calles con nombre, 3 plazas, carga de 1.6 s.

Revisadas a mano (vistas en `capturas/barrido/`, fuera de git): leyma-coruna, tenerife, charlotte-hornets, iraklis, galatasaray, portland-trail-blazers, real-madrid, karditsa, detroit-pistons, boston-celtics.

| Ciudad | País | Edificios | Calles | Plazas | Tipologías | Tranvía | Bus | Vecinos | Carga (s) | Avisos |
|---|---|---|---|---|---|---|---|---|---|---|
| atlanta-hawks | US | 54 | 21 | 4 | 7 | 13 |  | 137790 | 8.0 | ninguno |
| boston-celtics | US | 95 | 67 | 3 | 7 | 28 | 354 | 88587 | 2.0 | ninguno |
| brooklyn-nets | US | 445 | 77 | 4 | 7 | 0 | B63 | 127283 | 2.4 | ninguno |
| charlotte-hornets | US | 55 | 65 | 4 | 7 | 32 | 27 | 83188 | 1.6 | ninguno |
| chicago-bulls | US | 63 | 35 | 6 | 6 | 39 | 50 | 26549 | 1.3 | ninguno |
| cleveland-cavaliers | US | 78 | 38 | 1 | 7 | 37 | 251 | 101638 | 1.7 | ninguno |
| detroit-pistons | US | 92 | 57 | 3 | 6 | 12 | 461 | 63750 | 1.5 | ninguno |
| indiana-pacers | US | 83 | 76 | 1 | 6 | 0 | 90 | 82401 | 1.5 | ninguno |
| miami-heat | US | 77 | 42 | 2 | 7 | 4 | 93 | 119270 | 2.0 | ninguno |
| milwaukee-bucks | US | 70 | 115 | 3 | 7 | 5 | 40U | 76601 | 1.6 | ninguno |
| new-york-knicks | US | 211 | 43 | 1 | 7 | 0 | X22A | 388063 | 2.2 | ninguno |
| orlando-magic | US | 92 | 40 | 3 | 7 | 0 | Lymmo Lime Line | 67964 | 1.4 | ninguno |
| philadelphia-76ers | US | 86 | 22 | 2 | 5 | 0 | 17 | 13878 | 1.1 | ninguno |
| toronto-raptors | US | 55 | 75 | 4 | 7 | 52 | 320 | 150013 | 1.6 | ninguno |
| washington-wizards | US | 146 | 65 | 3 | 6 | 0 | D4X | 136532 | 1.3 | ninguno |
| dallas-mavericks | US | 71 | 52 | 2 | 7 | 31 |  | 47291 | 1.3 | ninguno |
| denver-nuggets | US | 95 | 50 | 3 | 6 | 58 | 1 | 77365 | 1.4 | ninguno |
| golden-state-warriors | US | 52 | 40 | 6 | 7 | 8 | Transbay | 32075 | 1.4 | ninguno |
| houston-rockets | US | 42 | 58 | 2 | 6 | 11 | Green | 63422 | 1.8 | ninguno |
| los-angeles-clippers | US | 153 | 40 | 2 | 6 | 0 | Lennox | 37915 | 1.4 | ninguno |
| los-angeles-lakers | US | 50 | 49 | 2 | 7 | 5 | 30 | 184411 | 1.6 | ninguno |
| memphis-grizzlies | US | 105 | 45 | 4 | 6 | 37 | 12 | 56934 | 1.9 | ninguno |
| minnesota-timberwolves | US | 71 | 71 | 3 | 7 | 43 | 5 | 131719 | 1.7 | ninguno |
| new-orleans-pelicans | US | 76 | 31 | 2 | 7 | 12 | 102 | 98780 | 1.5 | ninguno |
| oklahoma-city-thunder | US | 72 | 76 | 2 | 7 | 25 | 11 | 26666 | 1.3 | ninguno |
| phoenix-suns | US | 94 | 46 | 2 | 7 | 26 | 451 | 94957 | 1.8 | ninguno |
| portland-trail-blazers | US | 72 | 70 | 2 | 6 | 83 | 4 | 45325 | 1.5 | ninguno |
| sacramento-kings | US | 83 | 57 | 3 | 7 | 20 | 42B | 76327 | 2.0 | ninguno |
| san-antonio-spurs | US | 109 | 4 | 2 | 6 | 0 | 24 | 27633 | 1.0 | ninguno |
| utah-jazz | US | 81 | 50 | 4 | 7 | 31 | 205 | 33508 | 1.2 | ninguno |
| real-madrid | ES | 194 | 69 | 3 | 6 | 0 |  | 94175 | 1.8 | ninguno |
| fc-barcelona | ES | 101 | 52 | 2 | 6 | 7 | 101 | 79321 | 2.3 | ninguno |
| olympiacos | GR | 50 | 16 | 2 | 6 | 32 | Β1 | 35969 | 1.4 | ninguno |
| panathinaikos | GR | 294 | 84 | 3 | 6 | 23 | 209 | 82336 | 1.8 | ninguno |
| fenerbahce | TR | 91 | 36 | 2 | 7 | 0 | 8A | 73625 | 2.2 | ninguno |
| anadolu-efes | TR | 84 | 13 | 2 | 6 | 6 | HVL-4 | 45350 | 1.2 | ninguno |
| besiktas | TR | 348 | 88 | 3 | 6 | 6 |  | 53712 | 1.6 | ninguno |
| baskonia | ES | 45 | 12 | 2 | 6 | 0 | E3 | 30845 | 1.6 | ninguno |
| maccabi-tel-aviv | IL | 123 | 54 | 1 | 7 | 0 | 104 | 78960 | 1.4 | ninguno |
| hapoel-tel-aviv | IL | 74 | 12 | 3 | 6 | 0 | 909 | 16454 | 1.3 | ninguno |
| zalgiris-kaunas | LT | 53 | 10 | 1 | 6 | 0 | 106 | 22652 | 1.0 | ninguno |
| crvena-zvezda | RS | 101 | 34 | 3 | 7 | 7 | 33 | 57416 | 1.5 | ninguno |
| partizan | RS | 135 | 85 | 3 | 6 | 9 | A1 | 49119 | 1.6 | ninguno |
| virtus-bologna | IT | 649 | 127 | 8 | 7 | 17 | 30 | 80012 | 2.6 | ninguno |
| olimpia-milano | IT | 88 | 15 | 2 | 6 | 14 | z501 | 22107 | 1.2 | ninguno |
| bayern-munich | DE | 56 | 39 | 2 | 5 | 27 | LHX | 45523 | 1.4 | ninguno |
| valencia-basket | ES | 81 | 41 | 1 | 7 | 13 | 99 | 49111 | 1.5 | ninguno |
| paris-basketball | FR | 100 | 65 | 3 | 7 | 13 | N43 | 50488 | 1.8 | ninguno |
| asvel | FR | 47 | 19 | 3 | 6 | 64 | 85 | 20071 | 1.5 | ninguno |
| dubai-basketball | AE | 98 | 29 | 2 | 7 | 2 |  | 85503 | 1.2 | ninguno |
| unicaja | ES | 68 | 26 | 2 | 6 | 0 | 7 | 20370 | 1.2 | ninguno |
| joventut-badalona | ES | 93 | 85 | 3 | 6 | 8 | N11 | 80575 | 1.8 | ninguno |
| leyma-coruna | ES | 87 | 61 | 1 | 7 | 0 |  | 29607 | 1.7 | ninguno |
| tenerife | ES | 98 | 24 | 3 | 6 | 31 | 217 | 55959 | 2.6 | ninguno |
| ucam-murcia | ES | 130 | 33 | 3 | 6 | 0 | R20 | 45629 | 1.8 | ninguno |
| bilbao-basket | ES | 66 | 62 | 5 | 6 | 37 | 85 | 68195 | 1.7 | ninguno |
| girona | ES | 76 | 71 | 3 | 6 | 0 | L0577 | 5015 | 1.0 | ninguno |
| zaragoza | ES | 95 | 43 | 3 | 6 | 0 | N6 | 40512 | 1.3 | ninguno |
| manresa | ES | 77 |  | 3 | 6 | 0 | L4 | 29645 | 1.1 | ninguno |
| andorra | AD | 132 | 68 | 5 | 6 | 0 | L1 | 27094 | 1.5 | ninguno |
| hiopos-lleida | ES | 148 | 103 | 6 | 6 | 0 | 70 | 62698 | 1.7 | ninguno |
| breogan | ES | 53 | 31 | 3 | 6 | 0 | 1.3 | 7441 | 1.3 | ninguno |
| burgos | ES | 67 | 67 | 2 | 6 | 0 | L10 | 34685 | 1.7 | ninguno |
| obradoiro | ES | 94 | 32 | 2 | 5 | 0 | 9 | 24097 | 1.4 | ninguno |
| reyer-venezia | IT | 104 | 23 | 3 | 6 | 0 | 13 | 16868 | 1.6 | ninguno |
| trento | IT | 86 | 17 | 4 | 6 | 0 | A/ | 31371 | 1.3 | ninguno |
| reggio-emilia | IT | 303 | 58 | 8 | 6 | 0 | E | 30911 | 1.4 | ninguno |
| napoli-basket | IT | 92 | 11 | 3 | 6 | 0 | C14 | 20590 | 1.2 | ninguno |
| trieste | IT | 162 | 35 | 5 | 6 | 0 | 52 | 37301 | 1.5 | ninguno |
| varese | IT | 107 | 35 | 4 | 6 | 0 |  | 21287 | 1.2 | ninguno |
| treviso | IT | 117 | 8 | 3 | 6 | 0 | 1 | 18918 | 1.2 | ninguno |
| tortona | IT | 390 | 109 | 2 | 6 | 0 |  | 51984 | 1.5 | ninguno |
| cantu | IT | 94 | 21 | 3 | 6 | 0 |  | 23296 | 1.1 | ninguno |
| udine | IT | 141 | 72 | 7 | 6 | 0 | F | 11425 | 1.2 | ninguno |
| bc-roma | IT | 116 | 68 | 8 | 6 | 17 | 30 | 46230 | 1.6 | ninguno |
| maxima-roma | IT | 66 | 29 | 5 | 6 | 0 | 778 | 35720 | 1.6 | ninguno |
| scafati | IT | 118 | 7 | 4 | 6 | 0 |  | 11023 | 1.0 | ninguno |
| verona | IT | 191 | 36 | 3 | 6 | 0 | 91 | 58719 | 1.7 | ninguno |
| aek-atenas | GR | 294 | 83 | 2 | 6 | 23 | 209 | 82205 | 1.8 | ninguno |
| paok | GR | 333 | 103 | 4 | 6 | 0 | 14 | 74635 | 1.7 | ninguno |
| aris | GR | 117 | 39 | 3 | 6 | 0 | 28 | 60981 | 1.6 | ninguno |
| peristeri | GR | 543 | 87 | 3 | 6 | 26 | 706 | 90381 | 1.8 | ninguno |
| promitheas | GR | 726 | 43 | 1 | 6 | 0 | 3 | 45297 | 1.5 | ninguno |
| kolossos | GR | 298 | 64 | 3 | 6 | 0 |  | 24010 | 1.6 | ninguno |
| maroussi | GR | 294 | 84 | 3 | 6 | 23 | 209 | 82249 | 2.1 | ninguno |
| karditsa | GR | 644 | 65 | 5 | 6 | 0 |  | 36357 | 1.6 | ninguno |
| vikos | GR | 281 | 61 | 8 | 6 | 0 | 18 | 32926 | 1.7 | ninguno |
| doxa-lefkadas | GR | 1013 | 36 | 7 | 6 | 0 |  | 25249 | 1.6 | ninguno |
| iraklis | GR | 333 | 103 | 4 | 6 | 0 | 14 | 74674 | 1.9 | ninguno |
| mykonos | GR | 128 | 2 | 3 | 6 | 0 |  | 2194 | 1.2 | ninguno |
| alba-berlin | DE | 67 | 60 | 2 | 6 | 184 | 300 | 58930 | 1.6 | ninguno |
| ulm | DE | 102 | 37 | 1 | 6 | 0 | 72 | 20349 | 1.3 | ninguno |
| ludwigsburg | DE | 224 | 71 | 3 | 6 | 0 | 534 | 50729 | 1.5 | ninguno |
| bamberg | DE | 141 | 37 | 2 | 6 | 0 | 970 | 9684 | 1.3 | ninguno |
| bonn | DE | 135 | 60 | 2 | 6 | 0 | 843 | 22190 | 1.4 | ninguno |
| frankfurt | DE | 103 | 11 | 4 | 6 | 0 | M55 | 25046 | 1.3 | ninguno |
| hamburg | DE | 96 | 17 | 3 | 6 | 8 | 152 | 21077 | 1.3 | ninguno |
| oldenburg | DE | 131 | 28 | 5 | 6 | 0 | 322 | 43089 | 1.4 | ninguno |
| wuerzburg | DE | 119 | 47 | 3 | 7 | 29 | 34 | 30212 | 1.3 | ninguno |
| chemnitz | DE | 103 | 21 | 3 | 6 | 23 | 43 | 30145 | 1.2 | ninguno |
| weissenfels | DE | 119 | 26 | 3 | 6 | 0 |  | 26629 | 1.2 | ninguno |
| vechta | DE | 90 | 11 | 3 | 6 | 0 |  | 19853 | 1.0 | ninguno |
| jena | DE | 118 | 16 | 3 | 6 | 96 | 481 | 10463 | 1.3 | ninguno |
| rostock | DE | 56 | 75 | 3 | 6 | 44 | 26 | 34710 | 1.4 | ninguno |
| hagen | DE | 109 | 29 | 3 | 6 | 0 | 525 | 16894 | 1.2 | ninguno |
| trier | DE | 98 | 41 | 3 | 7 | 0 | 1 | 26190 | 1.4 | ninguno |
| braunschweig | DE | 100 | 93 | 3 | 6 | 124 | 431 | 52060 | 1.7 | ninguno |
| galatasaray | TR | 348 | 88 | 3 | 6 | 6 |  | 53701 | 1.6 | ninguno |
| tofas | TR | 174 | 111 | 3 | 6 | 11 |  | 19141 | 1.4 | ninguno |
| turk-telekom | TR | 230 | 41 | 2 | 7 | 0 | 261-6 | 76638 | 1.6 | ninguno |
| bahcesehir | TR | 348 | 88 | 3 | 6 | 6 |  | 53722 | 2.2 | ninguno |
| karsiyaka | TR | 97 | 21 | 2 | 6 | 36 | 445 | 47278 | 1.2 | ninguno |
| merkezefendi | TR | 217 | 54 | 3 | 6 | 0 |  | 20083 | 1.2 | ninguno |
| aliaga | TR | 329 | 54 | 1 | 6 | 0 |  | 39783 | 1.6 | ninguno |
| bursaspor | TR | 188 | 111 | 3 | 6 | 11 |  | 19221 | 1.4 | ninguno |
| korfez | TR | 166 | 8 | 3 | 6 | 0 | 200 | 7462 | 1.2 | ninguno |
| cayirova | TR | 176 | 10 | 3 | 6 | 0 |  | 13193 | 1.2 | ninguno |
| bandirma | TR | 270 | 25 | 3 | 6 | 0 | 19 | 32981 | 1.7 | ninguno |
| erokspor | TR | 348 | 88 | 3 | 6 | 6 |  | 53576 | 1.6 | ninguno |
| trabzonspor | TR | 668 | 85 | 6 | 6 | 0 | 204 | 41938 | 1.4 | ninguno |
