# Plantillas y canteras reales

Para cambiar las plantillas inventadas de las ligas nuevas (LNB, LKL, ABA, Israel) por reales:

1. Crea `recursos/plantillas_extra/<idClub>.csv` (o `.json`) con las columnas `nombre,pos,edad,altura,nac,ovr,pot,salario,hasta`, de mejor a peor jugador. Faltan `ovr`, `pot`, `salario` o `hasta`: se estiman según la reputación del club.
2. Canteras reales en `recursos/plantillas_extra/canteras.json` (por club: nombre, pos, edad, altura, nac, ovr, pot). Ya está Dabone en el Barça (datos estimados, hay que corregirlos).
3. `node tools/importar_plantillas_extra.js` genera `datos_plantillas_extra.js`; `node build.js` lo incluye.

Fuentes: webs de las federaciones y los clubes (lnb.fr, lkl.lt, aba-liga.com, ibasketball.co.il), Eurobasket, Proballers, RealGM y Wikipedia. `recursos/` no se sube a git.

## Estado (oct 2026)
25 clubes con plantilla real sacada de la Wikipedia inglesa (nombre, posición, edad, altura y nacionalidad reales; ovr, pot, salario y contrato estimados): LNB (Cholet, Limoges, Dijon, Strasbourg, Le Mans, Bourg, Nanterre, Gravelines, Chalon, Nancy, Boulazac), LKL (Rytas), ABA (Budućnost, Cedevita Olimpija, Igokea, Mega, Split, Zadar, Cibona, Krka) e Israel (Hapoel Jerusalem, Holon, Beer Sheva, Eilat y Maccabi Rishon). Pueden ir algo desfasadas respecto al verano. Faltan: Monaco, Orléans y Le Portel (LNB), los demás clubes de la LKL, Vojvodina, Spartak, Dubrovnik, Studentski Centar y los otros de Israel; siguen con relleno ficticio.
Canteras reales: Mohamed Dabone (Barça, pívot de 2,10 m, nacido el 21/10/2011 en Burkina Faso; el nivel ovr 52 y pot 90 es una estimación). No he encontrado fuentes fiables para otros canteranos: pásame nombres y los añado.
