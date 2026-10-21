// Punto 83: importa cada partida real de tools/partidas_antiguas/*.txt con el guardado de verdad (migraciones incluidas), juega 10 días y 30 más sin errores y revisa que no haya números rotos (NaN, infinito) en el dinero y las plantillas.
// Uso: node tools/partidas_antiguas.js     Sin partidas, sale bien (solo avisa): t_migracion.js ya prueba partidas fabricadas de versiones antiguas.
const fs = require('fs'),
  path = require('path');
const dir = path.join(__dirname, 'partidas_antiguas'),
  arch = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.txt$/i.test(f)) : [];
if (!arch.length) {
  console.log('Sin partidas reales en tools/partidas_antiguas (se usa t_migracion.js)');
  process.exit(0);
}
const L = require('../load');
const mods = eval(fs.readFileSync(path.join(__dirname, '..', 't_migracion.js'), 'utf8').match(/L\((\[[^\]]*\])/)[1]);
L(mods);
let fallos = 0;
arch.forEach(f => {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  let err = null,
    st = null;
  try {
    const r = GM.mods.guardado.importar(t);
    if (!r.ok) throw new Error(r.motivo);
    st = GM.state;
    for (let i = 0; i < 40; i++) GM.mods.competiciones.jugarDia(st);
  } catch (e) {
    err = e.message;
  }
  const rotos = st ? JSON.stringify(st, (k, v) => (typeof v === 'number' && !isFinite(v) ? '__ROTO__' : v)).split('__ROTO__').length - 1 : 0;
  const bien = !err && rotos === 0;
  if (!bien) fallos++;
  console.log((bien ? 'ok    ' : 'FALLA ') + f + (err ? ' ' + err : '') + (rotos ? ' ' + rotos + ' números rotos' : ''));
});
process.exit(fallos ? 1 : 0);
