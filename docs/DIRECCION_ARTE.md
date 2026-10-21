# Dirección artística (oct 2026)

Decisión: **una sola regla por calidad, no mezclar estilos dentro de una escena.**

## Calidad alta (ordenador, la principal)
- Edificios, calles, suelos y mobiliario: realistas (materiales PBR de ambientCG, modelos de Poly Haven, cielos HDRI, luz del sol por fecha y hora).
- Vehículos: `GM.kit.coche` (carrocería con pintura y cristal) y, para autobús y tranvía, `GM.vehiculos` con los colores de cada ciudad.
- Personas: las de Quaternius (estilizadas pero bien proporcionadas) hasta que haya personas realistas animadas; es la única excepción de estilo y se acepta porque va con ropa del club y animaciones por código.
- Monumentos: `GM.monumentos` con materiales PBR (iconos simplificados, no réplicas).

## Calidad normal (móvil y ordenadores flojos)
- Todo en estilo «low-poly limpio»: muebles y edificios de Kenney, coches de Kenney (`vendor/modelos/vehiculos`), personas de Quaternius, colores planos con la paleta del club.
- Sin sombras en tiempo real ni posprocesado; sombra pintada bajo los pies.

## Reglas
1. Color: siempre por tokens (`--club`, `--club2`, `--ok`, `--mal`, `--amb`; en 3D, los colores del club de `st.equipos[id].colores`). Nada de colores sueltos nuevos en la interfaz.
2. Un modelo nuevo se clasifica como «alta» o «normal» y no se usa en la otra calidad (salvo las personas).
3. Licencias: solo CC0 o MIT (ver `CREDITOS.md`); cada paquete nuevo entra con su línea de créditos y su presupuesto en `tools/modelos_presupuesto.js`.
4. Escala real: un coche mide 4 a 5 m, una puerta 2,1 m, una persona 1,6 a 1,95 m. Las pruebas de captura (`tools/vehiculos_capturas.js`, `tools/monumentos_capturas.js`) sirven para comprobarlo.
5. Sonido: efectos reales cortos (Kenney) para interfaz, pasos, botes y campanas; música generada por código con identidad por escena; la mezcla se ajusta en Ajustes.

## Qué falta para cerrar la dirección
- Personas realistas animadas (hoy, estilizadas): requiere un paquete con licencia libre o un generador (MakeHuman) y animaciones compatibles.
- Música real con licencia libre para sustituir las pistas sintéticas de las escenas principales.
