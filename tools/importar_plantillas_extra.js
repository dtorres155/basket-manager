// Plantillas reales de las ligas añadidas con datos (LNB, LKL, ABA, Israel…): convierte lo que tú descargues en datos_plantillas_extra.js.
// Dónde mirar: las webs de las federaciones y de los clubes (LNB: lnb.fr; LKL: lkl.lt; ABA: aba-liga.com; Israel: ibasketball.co.il), Eurobasket, Proballers, RealGM y la Wikipedia.
// Uso: node tools/importar_plantillas_extra.js          (lee recursos/plantillas_extra/*.csv o *.json y escribe datos_plantillas_extra.js)
//
// Un archivo por club con el id del club (recursos/plantillas_extra/monaco.csv). CSV con cabecera (separador coma o punto y coma):
//   nombre,pos,edad,altura,nac,ovr,pot,salario,hasta
//   Mike James,PG,35,185,US,,,,2027
// Solo hacen falta nombre, pos, edad y nac. Si falta ovr/pot/salario/hasta se ESTIMAN: las filas van ordenadas de mejor a peor jugador (o pon una columna «orden»);
// la media de los ocho mejores sale de la reputación del club (como en tools/generar_plantillas.js) y los jóvenes tienen más margen. Lo que sí escribas en ovr/pot/salario/hasta se respeta.
// Las canteras reales van en recursos/plantillas_extra/canteras.json: { "fc-barcelona": [{ "nombre": "Dabone", "pos": "SG", "edad": 18, "altura": 190, "nac": "ES", "ovr": 56, "pot": 78 }] }
// (ovr/pot también se estiman si faltan; con "estimado": true se anota que el nivel es una suposición). Los clubes que no estén en ese archivo siguen con canteras generadas.
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), DIR = path.join(RAIZ, 'recursos', 'plantillas_extra');
if (!fs.existsSync(DIR)) { fs.mkdirSync(DIR, { recursive: true }); console.log('Creada la carpeta ' + DIR + ': deja ahí un archivo por club.'); }
const GM = require(path.join(RAIZ, 'load'))(['core', 'ligas_config', 'datos_util', 'datos_valoraciones', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'datos_plantillas_extra', 'datos_ligas_extra']);
const POS = { PG: 'PG', SG: 'SG', SF: 'SF', PF: 'PF', C: 'C', G: 'SG', F: 'SF', 'G-F': 'SG', 'F-C': 'PF', Base: 'PG', Escolta: 'SG', Alero: 'SF', 'Ala-pívot': 'PF', 'Pívot': 'C' };
const PERFIL = { PG: 'P', SG: 'T', SF: 'E', PF: 'R', C: 'R' };
const csv = t => { const L = t.replace(/\r/g, '').split('\n').filter(x => x.trim()), sep = L[0].indexOf(';') >= 0 ? ';' : ',', cab = L[0].split(sep).map(x => x.trim().toLowerCase()); return L.slice(1).map(l => { const c = l.split(sep), o = {}; cab.forEach((k, i) => { o[k] = (c[i] || '').trim(); }); return o; }); };
const leer = f => (/\.json$/.test(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : csv(fs.readFileSync(f, 'utf8')));
const objetivo = e => 51 + e.reputacion * 0.25;   // media de los ocho mejores
function estima(filas, e, opt) {
  const rep = e ? e.reputacion : 45, base = e ? objetivo(e) : 55, n = filas.length;
  return filas.map((r, i) => {
    const edad = +r.edad || 25, pos = POS[r.pos] || 'SF', orden = r.orden !== undefined && r.orden !== '' ? +r.orden : i, k = Math.min(1, orden / Math.max(1, n - 1));
    const ovr = r.ovr ? +r.ovr : Math.round(base + 7 - k * 15 + ((edad <= 21) ? -4 : 0) + (r.nac && e && r.nac !== e.pais ? 1.5 : 0)), pot = r.pot ? +r.pot : Math.round(ovr + (edad < 22 ? 8 : edad < 25 ? 4 : edad < 29 ? 1 : 0));
    const sal = r.salario ? +r.salario : +(0.1 + Math.max(0, ovr - 55) * 0.035 * (rep / 55)).toFixed(2), hasta = r.hasta ? +r.hasta : 2027 + (GM.util.hash(r.nombre) >>> 0) % 3;
    return [r.nombre, pos, edad, Math.max(40, Math.min(92, ovr)), Math.max(ovr, Math.min(96, pot)), PERFIL[pos], sal, hasta, (r.nac || (e && e.pais) || 'ES').toUpperCase(), +r.altura || 0, !!(opt && opt.estimado) || !r.ovr];
  });
}
const salida = { plantillas: {}, canteras: {} }; let nClub = 0, nJug = 0;
fs.readdirSync(DIR).filter(f => /\.(csv|json)$/.test(f) && f !== 'canteras.json').forEach(f => {
  const id = f.replace(/\.(csv|json)$/, ''), e = GM.data.equipos[id]; if (!e) { console.log('AVISO: ' + f + ' no coincide con ningún club (¿id correcto?)'); return; }
  const filas = leer(path.join(DIR, f)); if (!filas.length) return; salida.plantillas[id] = estima(filas, e); nClub++; nJug += filas.length; console.log(id.padEnd(24), filas.length, 'jugadores');
});
const cf = path.join(DIR, 'canteras.json'); if (fs.existsSync(cf)) { const c = JSON.parse(fs.readFileSync(cf, 'utf8')); Object.keys(c).forEach(id => { const e = GM.data.equipos[id]; if (!e) { console.log('AVISO canteras: ' + id + ' no es un club'); return; } salida.canteras[id] = c[id].map((r, i) => ({ nombre: r.nombre, pos: POS[r.pos] || 'SG', edad: +r.edad || 18, altura: +r.altura || 0, nac: (r.nac || e.pais).toUpperCase(), ovr: r.ovr ? +r.ovr : Math.round(46 + (e.reputacion - 40) * 0.2), pot: r.pot ? +r.pot : Math.round(66 + (e.reputacion - 40) * 0.2), estimado: r.estimado !== false })); console.log('cantera de ' + id + ': ' + c[id].length + ' juveniles'); }); }
fs.writeFileSync(path.join(RAIZ, 'datos_plantillas_extra.js'), '/* Generado por tools/importar_plantillas_extra.js: no lo edites a mano (edita recursos/plantillas_extra y vuelve a ejecutarlo). Fila: [nombre,pos,edad,ovr,pot,perfil,salario M€,hasta,nac,altura,estimado]. */\n(function () {\n  GM.plantillasExtra = ' + JSON.stringify(salida.plantillas) + ';\n  GM.canteraReal = Object.assign(GM.canteraReal || {}, ' + JSON.stringify(salida.canteras) + ');\n})();\n');
console.log(nClub + ' clubes con plantilla real (' + nJug + ' jugadores) y ' + Object.keys(salida.canteras).length + ' canteras reales en datos_plantillas_extra.js');
