const fs=require('fs');
const mods=['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','personaje','carrera','fans','copas','continental','rivalidades','directo','entrenador','social','sponsor','pueblo','hogar','hogar3d','ui'];
const css=fs.readFileSync('estilos.css','utf8');
const js=mods.map(m=>'/* ===== '+m+' ===== */\n'+fs.readFileSync(m+'.js','utf8')).join('\n');
const html=`<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<meta name="theme-color" content="#e8590c">
<title>Basket Manager 2026-27</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Doto:wght@400..900&family=Graduate&display=swap" rel="stylesheet">
<style>
${css}</style></head>
<body><div id="app"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
try{
${js}
}catch(e){document.getElementById('app').innerHTML='<pre style="padding:16px;color:#ffb4a8;white-space:pre-wrap">Error al cargar: '+e.message+'</pre>';throw e;}
</script>
<script>
(function(){var a=document.getElementById('app');
try{ if(!window.GM) throw new Error('GM no cargado'); GM.ui.start(a);}catch(e){a.innerHTML='<pre style="padding:16px;color:#ffb4a8;white-space:pre-wrap">Error al arrancar: '+e.message+'</pre>';}
})();
</script></body></html>`;
fs.writeFileSync('index.html',html);
console.log('index.html',(html.length/1024).toFixed(0),'KB');
