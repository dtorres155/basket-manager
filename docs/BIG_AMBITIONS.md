# Qué sacar de Big Ambitions (punto 53)

Documento de diseño, previo a los puntos 54 a 58. Para cada mecánica del juego de referencia: cómo la hace, cómo la haríamos nosotros y qué dato necesita. Lo que ya existe está marcado con su módulo.

El juego de referencia es un simulador de empresas en una ciudad real: el jugador planifica un negocio, lo construye, lo opera y lo escala. Nosotros no gestionamos negocios, gestionamos un club y una vida; por eso cada mecánica se traduce a baloncesto y a patrimonio personal, no se copia tal cual.

## Tabla de mecánicas

| Mecánica | Cómo la hace | Cómo la haríamos | Qué dato necesita | Estado |
|---|---|---|---|---|
| (a) Bucle planificar, construir, operar y escalar | Eliges local, lo diseñas, contratas, abres, ves números y abres más | Planificar (presupuesto y plano), construir (obra con plazo), operar (día a día con efectos), escalar (siguiente nivel). Vale para la casa, el pabellón, la ciudad deportiva y los locales del club | Coste, plazo, ingresos o efecto por día de cada edificio | Casa: `casa_editor.js` y `casas_producto.js`. Campus y ciudad: `crecimiento.js`. Falta unificar el bucle en una pantalla |
| (b) Cámara libre y modo construcción | Cámara orbital, cuadrícula, piezas con precio, deshacer | Ya lo tenemos en la casa; falta reutilizarlo en despacho, local y pabellón | Plano y catálogo de cada espacio | Casa hecha (punto 50). Pendiente: despacho, locales y pabellón con el mismo editor |
| (c) Mundo vivo con agendas y necesidades | Cada ciudadano tiene casa, trabajo y rutina; el tráfico y las colas salen de ahí | Agendas por hora y rol, y presencia por zona según la población | Demografía por celdas, calendario, rol | `demografia.js`, `ciudad_dia.js`, `vecinos.js`, `dia_partido.js`. Faltan necesidades (hambre, sueño) en los vecinos |
| (d) Interfaz de paneles limpios con filtros y gráficos | Paneles laterales, tablas ordenables y gráficos de línea | Paneles de ficha con filtro y orden; gráficos de evolución (valor, caja, popularidad) | Series temporales por semana | Filtros en el catálogo de la casa. Faltan gráficos: se harán en 54 con las series del libro de cuentas |
| (e) Finanzas: préstamos, hipotecas, alquileres e impuestos | Préstamos con interés, alquileres a pagar, impuestos por periodo | Libro de cuentas del jugador y del club, hipoteca con cuota y deuda viva, alquiler, impuestos por país | Tipos de interés, tramos del IRPF y del impuesto de sociedades por país | Hipoteca y alquiler en `hogar.js` y `carrera.js`; deuda calculada en `casas_producto.js`. Falta libro único e impuestos (punto 54) |
| (f) Cadenas de suministro | Cada producto necesita materias primas y transporte | Para el club: material deportivo, comida del pabellón, merchandising y entradas, con proveedores y stock | Lista de productos, coste, proveedor, plazo | Solo pedidos con entrega en la casa. El resto, en 55 |
| (g) Tiempo acelerable con pausa | Velocidad x1, x2, x3 y pausa | Reloj del mundo con pausa y velocidades; acciones largas (dormir, obra) lo aceleran | Reloj único (`S.hora`) y fecha del estado | Reloj del mundo y barra de progreso de `interaccion.js`. Falta pausa y velocidades en el HUD |
| (h) Personal con sueldo y moral | Empleados con sueldo, habilidad y moral que afectan al negocio | Plantilla del club y cuerpo técnico (ya), más personal de casa y de locales | Sueldos por rol y país | Plantilla y `tactica.js`/staff. Falta el personal de los locales (56) |
| (i) Reputación y marketing | Reputación por zona, campañas que atraen clientes | Popularidad de la ciudad, patrocinios, campañas de abonados y redes sociales del jugador | Reputación, aforo, precio de entradas | `fans.js`, `sponsor.js`, `vida.js` (redes), `rivalidades.js`. Falta campaña pagada con retorno medible (57) |
| (j) Mercado inmobiliario | Precios por zona que suben o bajan, compra y venta | Índice por barrio y año, oferta de viviendas, locales y solares | Precio base por barrio, tendencia anual | Índice por barrio en `casas_producto.js`. Falta oferta variable y solares (54) |

## Decisiones de diseño

1. **Un solo libro de cuentas** (punto 54): `patrimonio.js` guarda movimientos fechados (ingreso, gasto, categoría, bien asociado). De ahí salen los gráficos, el patrimonio neto, los impuestos y los avisos de caja. Hoy cada módulo toca `hogar.dinero` por su cuenta; se migrarán a `patrimonio.mover(st, concepto, importe, bien)`.
2. **El tiempo es del mundo**: acciones y obras avanzan con el reloj y con `dia:avanzado`; el HUD ofrecerá pausa y velocidad (x1, x2, x4) sin cambiar la lógica diaria.
3. **El patrimonio es modo carrera primero**: en gestor, presidente y entrenador solo se usa la casa y las inversiones del club con el dinero de `hogar`.
4. **Realismo de tipos**: hipoteca a 25 años con interés fijo por país (ES 3,5 %, US 6,5 %, DE 3,8 %, GR 3,2 %, TR 30 %, IT 3,6 %, FR 3,4 %); impuestos con tramos simplificados (ES y US progresivos, TR fijo del 20 al 35 %).
5. **Nada nuevo sin dato**: cada bien nuevo (solar, local, aparcamiento, arte) se anuncia con precio base y tendencia propios y se prueba con un test de valor.
6. **Interfaz**: panel «Patrimonio» en Ciudad con tarjetas por bien, filtros por tipo y barrio, y un gráfico de patrimonio neto.

## Orden de trabajo

54 patrimonio (libro de cuentas, mercado, hipotecas, seguros e impuestos), 55 suministros del club, 56 personal de locales, 57 campañas y reputación, 58 panel de finanzas con gráficos. Cada uno con su `selfTest`, su prueba en Node y su captura.

Aprobado como punto de partida para programar 54 a 58 (los datos de tipos e impuestos de la decisión 4 son orientativos y se afinarán con fuentes en 54).
