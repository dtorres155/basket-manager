# Créditos y licencias de recursos de terceros

| Recurso | Autor | Licencia | Dónde |
|---|---|---|---|
| Three.js 0.186 con GLTFLoader, BufferGeometryUtils, RoundedBoxGeometry y Sky (`three.min.js`, empaquetado con esbuild) | Three.js Authors | MIT | `vendor/three.min.js`, `vendor/three.LICENSE` |
| Ultimate Modular Men Pack y Ultimate Modular Women Pack (14 personas vestidas y sus animaciones) | Quaternius (quaternius.com) | CC0 1.0 | `vendor/modelos/personas/` (procesados con `tools/preparar_personas.mjs`) |
| Texturas: Asphalt010, PavingStones070, Bricks085, Plaster003, Concrete034, Grass004, WoodFloor051, Tiles074, RoofingTiles013A, Ground054, Marble006, Facade006 (color, relieve y rugosidad, reducidas) | ambientCG (ambientcg.com) | CC0 1.0 | `vendor/texturas/` |
| Muebles y objetos realistas (34 modelos glTF en 1K: sofás, butacas, sillas, mesas, estanterías, televisores, lámparas, plantas, libros…) | Poly Haven (polyhaven.com) | CC0 1.0 | `vendor/modelos/reales/` |
| Mobiliario urbano realista (bocas de riego, armarios de instalaciones, alcantarillas, jardineras, bancos urbanos, mesas de pícnic, aires acondicionados) | Poly Haven (polyhaven.com) | CC0 1.0 | `vendor/modelos/reales/` |
| Árboles realistas simplificados (tree_small_02, jacaranda_tree, island_tree_01), solo en la versión de escritorio | Poly Haven (polyhaven.com) | CC0 1.0 | `recursos/pesados/` (fuera de git) |
| Kenney Furniture Kit (78 muebles usados) | Kenney (kenney.nl) | CC0 1.0 | `vendor/modelos/muebles/` |
| Kenney Building Kit (paredes, ventanas, puertas, columnas y cornisas) | Kenney (kenney.nl) | CC0 1.0 | `vendor/modelos/edificio/` |
| Car Kit 3.1 (11 vehículos: sedán, deportivo, SUV, furgoneta, taxi, policía, ambulancia, bomberos, reparto, basura y camión) | Kenney (kenney.nl) | CC0 1.0 | `vendor/modelos/vehiculos/` (calidad normal; el resto de paquetes de Kenney descargados está en `recursos/`, fuera de git) |
| Interface Sounds, Impact Sounds y Music Jingles (36 efectos y frases ogg: clics, pasos, botes, campana, victoria, derrota) | Kenney (kenney.nl) | CC0 1.0 | `vendor/audio/` |
| Short Loops Background Music Pack (4 bucles de música: A Brand New Wisdom, Just Saying Tho, Winter Dust, Swinging Sweet) | hernandack (opengameart.org/content/short-loops-background-music-pack) | CC0 1.0 | `vendor/audio/musica_*.ogg` |
| LZ-string 1.5 (`lz-string.min.js`) | Pieroxy | MIT | `vendor/lz-string.min.js`, `vendor/lz-string.LICENSE` |
| Graduate | Eduardo Tunni | SIL Open Font License 1.1 | `vendor/fonts/graduate-*.woff2`, `Graduate.OFL.txt` |
| Bricolage Grotesque (variable, ejes opsz y wght) | Mathieu Triay y The Bricolage Grotesque Project Authors | SIL Open Font License 1.1 | `vendor/fonts/bricolage-grotesque-*.woff2`, `BricolageGrotesque.OFL.txt` |
| Doto (variable, eje wght) | Oliver Lalan y The Doto Project Authors | SIL Open Font License 1.1 | `vendor/fonts/doto-*.woff2`, `Doto.OFL.txt` |
| Cielos HDRI 1K (kloofendal_48d_partly_cloudy_puresky, overcast_soil_puresky, qwantani_dusk_2_puresky, dikhololo_night) | Poly Haven (Greg Zaal, Jarod Guest, Sergej Majboroda) | CC0 1.0 | `vendor/hdri/` |
| Texturas: Asphalt031, PavingStones150, Metal055A (color, relieve y rugosidad, 1K); versiones KTX2 de todas las texturas (Basis Universal) | ambientCG (ambientcg.com) | CC0 1.0 | `vendor/texturas/`, `vendor/texturas_ktx2/` |
| Texturas de la fase B (44 materiales, 24 oct 2026): Bricks105, Bricks113A, PaintedPlaster017, Plaster007, PaintedPlaster006, Concrete046, Concrete045, Concrete048, Concrete036, Facade018A, Facade020A, RoofingTiles014A, RoofingTiles003, RoofingTiles006, RoofingTiles015A, Gravel040, CorrugatedSteel009, Asphalt033, PavingStones138, PavingStones136, PavingStones142, PavingStones146, Ground109, Gravel043, Grass001, ScatteredLeaves009, WoodFloor040, WoodFloor043, WoodFloor064, WoodFloor062, WoodFloor007, Tiles107, Tiles139, Tiles133A, Tiles110, Terrazzo019L, Carpet016, Carpet012, Marble012, Marble014, Travertine009, Metal049A, Metal046B, Planks021 (color, relieve y rugosidad, 1K, y sus versiones KTX2); descarga con `tools/materiales_descargar.js` | ambientCG (ambientcg.com) | CC0 1.0 | `vendor/texturas/`, `vendor/texturas_ktx2/` |
| Transcodificador Basis Universal (basis_transcoder.js y .wasm) para leer KTX2 | Binomial LLC, copiado de Three.js | Apache 2.0 | `vendor/basis/` |
| Clima medio mensual por ciudad (2015-2024: máximas, mínimas, días de lluvia y de nieve) | Open-Meteo.com (reanálisis ERA5, Copernicus Climate Change Service) | CC BY 4.0 | `datos_clima.js` (generado por `tools/clima_datos.js`) |

Los iconos de la app (`vendor/icons/`) son propios del proyecto, generados con `tools/iconos.js`.

Las fuentes vienen de los paquetes de Fontsource (`@fontsource/graduate`, `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/doto`), subconjuntos latin y latin-ext.

## Mapas
Los edificios, calles, ríos y parques que rodean la calle de cada club (`datos_osm.js`) proceden de OpenStreetMap, © colaboradores de OpenStreetMap, bajo licencia ODbL (https://www.openstreetmap.org/copyright).

Relieve lejano del horizonte (`hz` en `vendor/osm`, `tools/osm_horizonte.js`): Copernicus DEM GLO-90 a través de la API de elevación de Open-Meteo (CC BY 4.0, https://open-meteo.com). Costa, playas y muelles (`co`, `tools/osm_costa.js`): OpenStreetMap (ODbL).

Volúmenes de los edificios de las ciudades españolas con datos del Catastro (plantas de cada parte de edificio, uso y año; `tools/catastro.js`): © Dirección General del Catastro (INSPIRE, https://www.catastro.hacienda.gob.es), uso libre con mención de la fuente.

Foto aérea del suelo lejano y color de los tejados (`vendor/orto`, `tools/ortofoto.js`): PNOA, © Instituto Geográfico Nacional, CC BY 4.0 (scne.es).

Relieve fino de las ciudades españolas (`h` en `vendor/osm` cuando hay MDT, `tools/mdt.js`): Modelo Digital del Terreno del IGN (MDT25, servicio WCS), © Instituto Geográfico Nacional, CC BY 4.0 (scne.es). Los árboles de Badalona salen de la misma ortofoto del PNOA (`tools/arboles_orto.js`).
