const L=require('./load');L(['core','datos_util','finanzas','ciudad','cantera']);
const st = { temporada: '2026-27', fecha: '2026-10-05', clubId: 'a', noticias: [], equipos: { a: { id: 'a', pais: 'ES', presupuesto: 30e6, reputacion: 60, plantilla: [] } }, jugadores: {}, cantera: {} };
for (let i = 0; i < 30; i++) { const p = GM.mkJugador('a', i + 1, 'x' + i, 'SF', 20 + i % 15, 200, 'ES', 'UE', 62 + i % 6, 66, 'E', 1e6, 2027); st.jugadores[p.id] = p; st.equipos.a.plantilla.push(p.id); }
st.cantera.a = { juveniles: [], prospectos: [], foco: 'equilibrado', scouts: [{ zona: 'espana', nivel: 1 }], seq: 0 };
const grupo = (f) => { const l = st.equipos.a.plantilla.map(i => st.jugadores[i]).filter(f); return [l.reduce((s, p) => s + p.ovr, 0) / (l.length || 1), l.length]; };
console.log(grupo(p=>p.edad<=22),grupo(p=>p.edad>=33));
GM.rng.seed(3);
for (let y = 0; y < 3; y++) GM.mods.cantera.progresionAnual(st);
console.log(grupo(p=>p.edad<=25),grupo(p=>p.edad>=36),st.cantera.a.juveniles.length);
