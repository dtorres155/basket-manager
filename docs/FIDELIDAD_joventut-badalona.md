# Fidelidad de la ciudad: joventut-badalona

Generado el 2026-10-13 con `node tools/fidelidad.js joventut-badalona`. Compara la escena con los datos de OpenStreetMap y el relieve; no mide el parecido visual: para eso están las vistas de `capturas/fidelidad/joventut-badalona/` (se guardan fuera de git) y las fotos de `recursos/referencias/` (autores en `docs/referencias/`).

## Lista de control

| Criterio | Resultado | Detalle |
|---|---|---|
| Las 8 calles más largas del plano existen con su nombre | Cumple | Autopista del Maresme, Carrer de Ramon Llull, Avinguda del Marquès de Mont-roig, Carrer de Ponent, Avinguda de Salvador Espriu, Carrer d'Antoni Bori, Avinguda d'Alfons XIII, Plaça de Joan Miró |
| Todos los edificios de los datos están en la escena (al menos el 95 %) | Cumple | 78 de 78 (100 %) |
| El pabellón está a menos de 60 m del centro de los datos | Cumple | 50 m |
| Hay al menos tres tipologías de fachada distintas | Cumple | {"bloque":30,"nave":5,"singular":4,"casa":23,"oficinas":2,"ensanche":29} |
| Plazas reales de OpenStreetMap dibujadas | Cumple | 24 en los datos, 3 en la escena |
| El relieve de la escena sigue al real (diferencia máxima menor de 4 m en 81 puntos) | Cumple | diferencia máxima 1.6 m, la escena va de -12 a 26 m |
| Hay semáforos en los cruces con semáforo de los datos (al menos el 25 %) (orientativo) | Cumple | 15 en la escena frente a 38 en los datos |
| Los comercios con nombre tienen rótulo (al menos el 70 % de los que caben) (orientativo) | Cumple | 10 escaparates con 42 comercios con nombre en los datos |
| Calles con carriles reales | Cumple | 62 de 102 calles con número de carriles |
| Red de transporte: metro con 2 o más estaciones, tranvía si lo hay y línea de autobús real | Cumple | metro 4, tramos de tranvía 8, línea de bus N11 de 10 |
| Partes de edificio de los datos (torres y voladizos) dibujadas (orientativo) | Cumple | 480 en los datos |
| Torres de iglesia y ayuntamiento | Cumple | 1 torres (0 iglesias y 1 edificios civiles) |
| Población estimada coherente (entre 5.000 y 120.000 vecinos) (orientativo) | Cumple | 80634 vecinos, 3606 empleos |

**9 de 9 criterios obligatorios cumplidos.**

## Comparación visual a mano

Para cada vista, abre la captura junto a una foto o a la vista aérea del mismo sitio y marca qué falta:

- [ ] `01_aerea_pabellon.png`
- [ ] `02_avenida_principal.png`
- [ ] `03_plaza.png`
- [ ] `04_barrio_ensanche.png`
- [ ] `05_rambla_tranvia.png`
- [ ] `06_ladera.png`
- [ ] `07_noche_centro.png`

Preguntas: ¿se reconoce la calle principal por su ancho, carriles y arbolado? ¿la plaza tiene la forma y los edificios que la rodean? ¿las cuestas tienen la pendiente de verdad? ¿los edificios singulares (iglesia, ayuntamiento, mercado, estación) se distinguen? ¿el tranvía o el bus pasa por donde pasa en la realidad?
