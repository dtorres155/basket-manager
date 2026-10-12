# Datos de las ciudades reales

Fuente: OpenStreetMap (© colaboradores, ODbL; se acredita en `CREDITOS.md`). Todo se regenera con `node tools/datos.js <orden>`.

| Orden | Qué hace | Salida |
|---|---|---|
| `descargar [ids]` | Busca el centro del pabellón (Nominatim; se corrige a mano en `recursos/osm/centros.json`) y baja edificios, calles, agua y parques de 300 m (Overpass, con espejos) | `recursos/osm/<id>.json` |
| `poi [ids]` | Comercios, árboles, paradas, semáforos, bancos, aparcamientos, uso del suelo, vías y vallas | `<id>.poi.json` |
| `anillo [ids]` | Edificios de 300 a 480 m para el anillo lejano | `<id>.ring.json` |
| `generar` | Compacta todo (decímetros, textos en tabla) con latitud y longitud (`g`) | `vendor/osm/<id>.json` |
| `validar` | Lista los clubes con menos de 10 edificios o 20 tramos de calle (usan la calle inventada) | pantalla |
| `creditos` | Regenera la tabla de `CREDITOS.md` desde `docs/licencias.json` | `CREDITOS.md` |
| `todo [ids]` | Todo lo anterior seguido | |

Notas: `recursos/` no se sube a git; `vendor/osm` sí. Si Overpass responde «SIN DATOS», repetir más tarde. Nombres de pabellón mal encontrados se arreglan con una entrada en `centros.json` (`"id": [lat, lon, "nota"]`). El formato compacto está en la cabecera de `tools/osm_generar.js`.

Licencias: `docs/licencias.json` es la fuente única; al añadir un recurso se añade ahí y se ejecuta `creditos`.

Estado: las 120 ciudades usan plano real (los pabellones aislados de Manresa, Treviso, Philadelphia y Zalgiris salen con pocas casas y mucho aparcamiento, que es lo que hay en OpenStreetMap). Condición: 10 edificios y 6 tramos de calle, o 30 tramos (los edificios que faltan se sintetizan).
