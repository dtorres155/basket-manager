# Rendimiento 3D (fase 1.3, 5 oct 2026)

Medido con `node tools/perfil.js --lento` (Edge, 390×844 a 2×, **CPU 4 veces más lenta** para simular un móvil de gama media). La GPU es la del PC, así que la prueba de verdad es tu móvil.

Cambios aplicados:
- **Fusión de geometría estática** (`GM.kit.fusionar`): cientos de mallas pasan a una por material. Lo animado o lo que se puede tocar (lo que tiene `userData`) no se fusiona.
- **Calidad «normal» por defecto en pantallas táctiles:** sin sombras ni animaciones y con resolución hasta 1,5×. «Alta» queda para el ordenador o para quien la elija.

| Escena | Antes, alta (por defecto) | Ahora, normal (por defecto en móvil) | Ahora, alta |
|---|---|---|---|
| Ciudad deportiva | 10 fps, 381 llamadas | **60 fps**, 85 llamadas, 11 ms | 34 fps |
| Mapa de la ciudad | 8–14 fps, 423 llamadas | **60 fps**, 81 llamadas | 33 fps |
| Calle | 32 fps | **61 fps**, 10 ms | 47 fps |
| Pueblo | 12–15 fps, 302 llamadas | **60 fps**, 94 llamadas, 12 ms | 51 fps |
| Pabellón | 60 fps | 60 fps | 61 fps |
| Casa | 60 fps | 60 fps | 60 fps |
| Partido en directo | 60 fps | 60 fps | 60 fps |

En una línea por escena: ciudad deportiva 60, mapa 60, calle 61, pueblo 60, pabellón 60, casa 60 y directo 60 fps en calidad normal con la CPU limitada.
