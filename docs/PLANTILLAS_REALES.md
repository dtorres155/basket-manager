# Plantillas y canteras reales

Para cambiar las plantillas inventadas de las ligas nuevas (LNB, LKL, ABA, Israel) por reales:

1. Crea `recursos/plantillas_extra/<idClub>.csv` (o `.json`) con las columnas `nombre,pos,edad,altura,nac,ovr,pot,salario,hasta`, de mejor a peor jugador. Faltan `ovr`, `pot`, `salario` o `hasta`: se estiman según la reputación del club.
2. Canteras reales en `recursos/plantillas_extra/canteras.json` (por club: nombre, pos, edad, altura, nac, ovr, pot). Ya está Dabone en el Barça (datos estimados, hay que corregirlos).
3. `node tools/importar_plantillas_extra.js` genera `datos_plantillas_extra.js`; `node build.js` lo incluye.

Fuentes: webs de las federaciones y los clubes (lnb.fr, lkl.lt, aba-liga.com, ibasketball.co.il), Eurobasket, Proballers, RealGM y Wikipedia. `recursos/` no se sube a git.
