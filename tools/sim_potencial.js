// Simula carreras con distintos hábitos y muestra cómo se mueve el potencial dinámico.
// Uso: node tools/sim_potencial.js [temporadas]
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const L = require('../load');
L(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades', 'personaje', 'carrera', 'social', 'sponsor', 'pueblo']);
const TEMPS = +process.argv[2] || 5;
const PERFILES = {
  'disciplinado': { intensidad: 'intensa', foco: 'tiro', fiesta: false, mentor: true },
  'normal': { intensidad: 'normal', foco: null, fiesta: false, mentor: false },
  'juerguista': { intensidad: 'suave', foco: null, fiesta: true, mentor: false }
};
for (const [nombre, pf] of Object.entries(PERFILES)) {
  for (const origen of ['cantera', 'europa']) {
    GM.rng.seed(11);
    const st = GM.newGame('joventut-badalona', 7, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen, clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const K = GM.mods.carrera, C = GM.mods.competiciones, S = GM.mods.social, p = st.jugadores.yo, pot0 = p.pot, focos = ['tiro', 'defensa', 'fisico', 'pase', 'mente'];
    const fila = [];
    for (let y = 0; y < TEMPS; y++) {
      let d = 0;
      while (!st.temporadaTerminada) {
        st.carrera.entreno.intensidad = pf.intensidad;
        st.carrera.entreno.foco = pf.foco || focos[(d >> 4) % 5];
        if (GM.util.weekday(st.fecha) === 6) {
          const s = st.carrera.social; s.energia = 3;
          const am = s.contactos.find(k => k.tipo === 'amigo'), men = s.contactos.find(k => k.tipo === 'mentor');
          if (pf.fiesta && am) S.hacer(st, am.id, 'fiesta');
          if (pf.mentor && men) { S.hacer(st, men.id, 'consejo'); }
        }
        C.jugarDia(st); d++; K.eventos(st).forEach(e => K.elegirEvento(st, e.id, 0));
      }
      fila.push(p.edad + 'a ' + p.ovr + '/' + p.pot);
      const o = st.carrera.ofertas.find(x => x.tipo === 'Renovación') || st.carrera.ofertas[0]; if (o) K.aceptar(st, o.id); C.nuevaTemporada(st);
    }
    const P = st.carrera.potencial || { ajuste: 0 };
    console.log(nombre.padEnd(13), origen.padEnd(8), 'pot inicial', pot0, '| ajuste', (P.ajuste + (P.resto || 0)).toFixed(1).padStart(5), '|', fila.join('  '));
  }
}
