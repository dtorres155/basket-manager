# Biblioteca de objetos

Generado con `node tools/ingesta.js informe`. 755 objetos en `vendor/modelos/objetos/catalogo.json`; 119 están incluidos en el juego y el resto se pueden activar con `node tools/ingesta.js incluir <id>` (los de Poly Haven se descargan con `polyhaven <id>`).

## Cómo añadir un modelo

- Poly Haven (CC0): `node tools/ingesta.js polyhaven <id>`; por categoría: `polyhaven --categoria=furniture --n=40`; todo lo de interior: `polyhaven --interior`.
- Otro sitio: `node tools/ingesta.js archivo modelo.glb --id=x --nombre="..." --categoria=mueble --licencia=CC0 --autor="..." --alto=0.8 --url=...` (solo licencias que permitan redistribuir; las CC-BY necesitan el autor).
- Cada modelo se simplifica (máximo 4.000 triángulos por defecto), se bajan las texturas a 512 px, el pivote queda en el centro de la base y se registra su licencia aquí.

## Recuento

| Origen | Objetos |
|---|---|
| polyhaven | 216 |
| kenney-food | 200 |
| kenney-furniture | 140 |
| kenney-survival | 80 |
| kenney-building | 79 |
| kenney-mini | 26 |
| quaternius | 14 |

| Categoría | Objetos |
|---|---|
| objeto | 375 |
| mueble | 110 |
| edificio | 96 |
| asiento | 32 |
| decoración | 26 |
| electrodoméstico | 22 |
| iluminación | 14 |
| persona | 14 |
| planta | 13 |
| electrónica | 11 |
| comida | 10 |
| contenedor | 8 |
| baño | 8 |
| industrial | 8 |
| estantería | 2 |
| mesa | 2 |
| herramienta | 2 |
| jarrón | 1 |
| decoración de pared | 1 |

| Licencia | Objetos |
|---|---|
| CC0 1.0 | 755 |

## Créditos

| Origen | Licencia | Autor | Objetos |
|---|---|---|---|
| polyhaven | CC0 1.0 | Kirill Sannikov | 31 |
| polyhaven | CC0 1.0 | Jake Mobley | 1 |
| polyhaven | CC0 1.0 | Fernando Quinn | 2 |
| polyhaven | CC0 1.0 | Joe Seabuhr | 2 |
| polyhaven | CC0 1.0 | Rajil Jose Macatangay | 2 |
| polyhaven | CC0 1.0 | Caspian Fortune | 1 |
| polyhaven | CC0 1.0 | Ethan Simon-Law | 1 |
| polyhaven | CC0 1.0 | Ethan Place | 3 |
| polyhaven | CC0 1.0 | Jorge Camacho | 3 |
| polyhaven | CC0 1.0 | Gabriel Radić | 1 |
| polyhaven | CC0 1.0 | Joseph Burgan | 1 |
| polyhaven | CC0 1.0 | Fran Calvente | 3 |
| polyhaven | CC0 1.0 | James Ray Cock | 22 |
| polyhaven | CC0 1.0 | Dairon Sanchez | 1 |
| polyhaven | CC0 1.0 | John Malcolm | 1 |
| polyhaven | CC0 1.0 | Bhargav Kubal | 1 |
| polyhaven | CC0 1.0 | Rico Cilliers | 12 |
| polyhaven | CC0 1.0 | Tina | 5 |
| polyhaven | CC0 1.0 | Greg Zaal | 1 |
| polyhaven | CC0 1.0 | Greg Zaal, James Ray Cock | 1 |
| polyhaven | CC0 1.0 | Jan Martens | 2 |
| polyhaven | CC0 1.0 | Ulan Cabanilla | 20 |
| polyhaven | CC0 1.0 | Oday Abuzaeed | 1 |
| polyhaven | CC0 1.0 | Riley Queen | 2 |
| polyhaven | CC0 1.0 | Rico Cilliers, Riley Queen | 1 |
| polyhaven | CC0 1.0 | Greg Zaal, Dario Barresi | 1 |
| polyhaven | CC0 1.0 | Rob Tuytel, Rico Cilliers | 4 |
| polyhaven | CC0 1.0 | Sean Buckley | 1 |
| polyhaven | CC0 1.0 | Kuutti Siitonen | 18 |
| polyhaven | CC0 1.0 | Anzor Lezhava | 1 |
| polyhaven | CC0 1.0 | Vibrant Nordic | 1 |
| polyhaven | CC0 1.0 | Amin | 2 |
| polyhaven | CC0 1.0 | Patrik Pangerl | 1 |
| polyhaven | CC0 1.0 | Kosan Aziz | 1 |
| polyhaven | CC0 1.0 | ParzivalCG | 1 |
| polyhaven | CC0 1.0 | Serhii Khromov | 3 |
| polyhaven | CC0 1.0 | James Ray Cock, Rico Cilliers, Jurita Burger | 1 |
| polyhaven | CC0 1.0 | James Ray Cock, Jenelle van Heerden | 1 |
| polyhaven | CC0 1.0 | Maximilian Schuster | 1 |
| polyhaven | CC0 1.0 | Monsta3D | 1 |
| polyhaven | CC0 1.0 | Oliver Harries | 8 |
| polyhaven | CC0 1.0 | Rico Cilliers, Jurita Burger | 1 |
| polyhaven | CC0 1.0 | Josh Dean | 2 |
| polyhaven | CC0 1.0 | Ronnie Barter | 1 |
| kenney-furniture | CC0 1.0 | Kenney (kenney.nl) | 140 |
| kenney-building | CC0 1.0 | Kenney (kenney.nl) | 79 |
| kenney-mini | CC0 1.0 | Kenney (kenney.nl) | 26 |
| quaternius | CC0 1.0 | Quaternius (quaternius.com) | 14 |
| polyhaven | CC0 1.0 | Poly Haven (polyhaven.com) | 26 |
| polyhaven | CC0 1.0 | James Ray Cock, Ulan Cabanilla | 3 |
| polyhaven | CC0 1.0 | Yann Kervran, James Ray Cock | 1 |
| polyhaven | CC0 1.0 | Tal Swicegood | 2 |
| polyhaven | CC0 1.0 | Rohit Seervi | 1 |
| polyhaven | CC0 1.0 | UM JOORIN | 2 |
| polyhaven | CC0 1.0 | James Ray Cock, Kuutti Siitonen | 1 |
| polyhaven | CC0 1.0 | Nazar Borodavka | 1 |
| polyhaven | CC0 1.0 | GreenPixel | 1 |
| polyhaven | CC0 1.0 | Sofia Pahaoja | 2 |
| polyhaven | CC0 1.0 | James Ray Cock, Jurita Burger | 1 |
| polyhaven | CC0 1.0 | Garreth Dean | 1 |
| polyhaven | CC0 1.0 | Yann Kervran, Rico Cilliers | 1 |
| polyhaven | CC0 1.0 | Amal Kumar | 2 |
| kenney-food | CC0 1.0 | Kenney (kenney.nl) | 200 |
| kenney-survival | CC0 1.0 | Kenney (kenney.nl) | 80 |
