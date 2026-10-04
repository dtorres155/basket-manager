const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','continental','rivalidades']);
console.log('selfTest',GM.mods.continental.selfTest());
const st=GM.newGame('joventut-badalona',3), C=GM.mods.competiciones, K=GM.mods.continental;
for (const [id,c] of Object.entries(st.continental)) console.log(id,'directos',c.directos.length,'previa',c.pre.length);
console.log('Joventut en',K.de(st,'joventut-badalona').join(','));
let n=0; const estados={}; while(!st.temporadaTerminada&&n<420){ C.jugarDia(st); n++; Object.entries(st.continental).forEach(([id,c])=>{ estados[id+':'+c.estado]=estados[id+':'+c.estado]||st.fecha; }); }
console.log('días',n,'terminada',st.temporadaTerminada); console.log('transiciones',JSON.stringify(estados));
for (const [id,c] of Object.entries(st.continental)) console.log(id,c.estado,'campeón',c.campeon,'grupos',c.grupos.length,'ko',c.ko.map(r=>r.nombre+':'+r.series.length).join(' / '));
const seen={}; let dup=0; st.calendario.forEach(g=>[g.local,g.visitante].forEach(t=>{const k=g.fecha+t; if(seen[k]) dup++; seen[k]=1;})); console.log('dobles reservas',dup,'partidos continentales',st.calendario.filter(g=>g.fase==='continental').length,'jugados',st.calendario.filter(g=>g.fase==='continental'&&g.resultado).length);
console.log(st.historial.filter(h=>st.continental[h.comp]).map(h=>h.comp+':'+h.campeon).join(', '));
if(st.continental.BCL.grupos[0]) console.log('grupo A BCL',K.tablaGrupo(st,'BCL',0).map(r=>r.equipoId.slice(0,10)+' '+r.g+'-'+r.p).join(', '));
C.nuevaTemporada(st); console.log('2ª temporada',Object.values(st.continental).map(c=>c.estado).join(','));
