# Equilibrio (tools/equilibrio.js)

`node tools/equilibrio.js [temporadas] [semilla]` juega varias temporadas sin tocar nada en seis clubes de muestra y resume posición, caja, masa salarial y media. Primera medida (4 temporadas, semilla 1): sin alertas económicas, la media del equipo baja 2 a 5 puntos si no renuevas a nadie (masa salarial a la mitad), las clasificaciones se reparten (no domina siempre el mismo) y hay 56 jugadores de 80 o más y 2 de 90 o más en todo el juego.
Encontró un error real: un juvenil que ya estaba en una plantilla se borraba al salir de la cantera y dejaba una referencia rota (arreglado en cantera.js y mercado.js, con prueba en t_diseno.js).
