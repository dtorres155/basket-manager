// Cómo evoluciona la fama del jugador en una carrera: fama al final de cada temporada y los saltos más grandes en un día.
// Uso: node tools/sim_fama.js [temporadas] [origen]
const path = require('path'); process.chdir(path.join(__dirname, '..'));
const fs = require('fs'), L = require('../load');
eval(fs.readFileSync('tools/sim_potencial.js', 'utf8').split(/\r?\n/).find(l => l.startsWith('L([')));
const TEMPS = +process.argv[2] || 8, ORIGEN = process.argv[3] || 'cantera';
GM.rng.seed(11);
const st = GM.newGame('joventut-badalona', 7, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: ORIGEN, clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
const K = GM.mods.carrera, C = GM.mods.competiciones, c = st.carrera, p = st.jugadores.yo, saltos = [];
c.entreno.intensidad = 'intensa';
for (let y = 0; y < TEMPS; y++) {
  while (!st.temporadaTerminada) {
    const f0 = c.fama, h0 = c.hitos[0];
    C.jugarDia(st); K.eventos(st).forEach(e => K.elegirEvento(st, e.id, 0));
    const d = c.fama - f0; if (Math.abs(d) >= 2) saltos.push({ d: Math.round(d * 10) / 10, fecha: st.fecha, motivo: c.hitos[0] !== h0 ? c.hitos[0].texto.slice(0, 70) : '(fin de mes o temporada)' });
  }
  const g = K.gradoFama(c);
  console.log(st.temporada, p.edad + ' años', 'nivel ' + p.ovr, '| fama ' + c.fama.toFixed(1), '(' + g.nombre + ')', '|', K.liga(st) || c.fase);
  const RN = { Titular: 3, 'Rotación': 2, Banquillo: 1 }, NV = { NBA: 4, EUROLIGA: 3 }, ofs = c.ofertas.slice().sort((a, b) => ((RN[b.rol] || 0) * 2 + (NV[b.liga] || 2)) - ((RN[a.rol] || 0) * 2 + (NV[a.liga] || 2)));
  if (ofs[0]) K.aceptar(st, ofs[0].id); C.nuevaTemporada(st);
}
console.log('saltos de 2 o más en un día:', saltos.length); saltos.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 8).forEach(s => console.log('  ', s.d > 0 ? '+' + s.d : s.d, s.fecha, s.motivo));
