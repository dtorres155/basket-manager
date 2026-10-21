# Auditoría de recursos y licencias (punto 75)

Qué hay y qué podría entrar. **Nada de lo que está en «Candidatos» se ha descargado ni se descargará sin tu visto bueno.** Las licencias de los recursos que ya usamos están en `CREDITOS.md` (y `docs/licencias.json`). Las licencias de los candidatos las he anotado de memoria: antes de bajar nada se comprueban en la página de cada modelo.

## Reglas
- Para el repositorio público solo CC0 o MIT sin más. CC BY es posible con crédito en `CREDITOS.md` (autor, título, enlace). Nada CC BY-NC (no comercial), CC BY-SA (obliga a compartir igual) ni GPL en los modelos.
- Para la versión de escritorio se pueden usar modelos pesados que no se suban a git (`recursos/pesados/`), pero con la misma licencia.
- Todo modelo nuevo pasa por `node tools/modelos_optimizar.js` (punto 79) y por su presupuesto de `docs/PRESUPUESTOS.md`.

## Lo que ya usamos
| Fuente | Licencia | Qué tenemos | Calidad | Uso |
|---|---|---|---|---|
| Quaternius (Ultimate Modular Men y Women) | CC0 | 14 personas animadas | estilizada, buena | gente de todas las escenas |
| Kenney (Furniture Kit, Building Kit) | CC0 | 78 muebles y piezas de edificio | simple, limpia | calidad «normal» (móvil) y edificios |
| Poly Haven (modelos, HDRI) | CC0 | 34 muebles y mobiliario urbano, 4 cielos, 3 árboles (escritorio) | realista | calidad «alta» |
| ambientCG | CC0 | 15 materiales (KTX2) | realista | suelos, fachadas, tejados |
| OpenStreetMap | ODbL | plano de cada ciudad | datos reales | calle real |
| Open-Meteo | CC BY 4.0 | clima por ciudad | datos | luz y lluvia |

## Candidatos (ordenados por prioridad)
| Prioridad | Fuente | Licencia | Qué ofrece | Peso | Para qué punto |
|---|---|---|---|---|---|
| 1 | Kenney, Car Kit y City Kit (Commercial, Suburban, Roads) | CC0 | coches, camiones, autobús, taxi, edificios de ciudad y carreteras en low-poly | muy bajo | 76 (vehículos), 78 |
| 1 | Quaternius, Ultimate Nature, Stylized Nature, Cars, Modular Streets | CC0 | árboles, arbustos, flores, rocas, coches y calles | bajo | 76, 77 |
| 1 | Poly Haven (más modelos) | CC0 | bancos, papeleras, buzones, farolas, vegetación, contenedores, bicicletas | medio (se simplifican) | 77, escritorio |
| 2 | Poly Pizza (poly.pizza) | CC0 y CC BY según modelo | miles de modelos low-poly (coches, tranvía, metro, mobiliario), con autor y licencia a la vista | bajo | 76, 77 |
| 2 | Quaternius, Universal Animation Library | CC0 | animaciones comunes para los esqueletos que ya usamos (andar, correr, sentarse, saludar) | bajo | personas |
| 2 | Kenney, Nature Kit y Animated Characters | CC0 | vegetación y personajes extra | bajo | 77 |
| 3 | Sketchfab, solo filtro «Downloadable» y licencia CC0 o CC BY | CC0 o CC BY (comprobar uno a uno) | coches, tranvías, autobuses y edificios singulares realistas | alto (hay que simplificar) | 76 y 78 en escritorio |
| 3 | MakeHuman (los modelos que exportas son CC0) | CC0 | personas realistas generadas por ti con ropa y cuerpos distintos | medio | personas realistas en escritorio |
| 4 | Mixamo (Adobe) | gratis para usar en juegos; no se puede redistribuir el archivo suelto | animaciones realistas de muchos tipos | medio | solo si aceptas la condición en un repositorio público (mejor solo escritorio) |
| 4 | OpenGameArt | mezcla de CC0, CC BY, CC BY-SA y GPL | de todo, calidad desigual | variable | solo lo marcado CC0 |

## Recomendación
1. Kenney Car Kit y City Kit, y Quaternius Cars y Nature para los puntos 76 y 77 (todo CC0, ligero y compatible con el móvil).
2. Poly Haven para la calidad «alta» de escritorio.
3. Dejar Sketchfab y MakeHuman para los edificios icónicos (78) y personas realistas, y solo con modelos CC0.
4. Mixamo solo si lo pides; no lo necesitamos mientras sigamos con Quaternius.

## Qué necesito de ti
Que me digas qué paquetes de la lista quieres que descargue (por nombre). Para cada uno guardo el original en `recursos/`, lo optimizo y lo añado a `CREDITOS.md`.
