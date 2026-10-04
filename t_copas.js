const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador']);
console.log('selfTests',GM.mods.copas.selfTest(),GM.mods.rivalidades.selfTest());
const st=GM.newGame('fc-barcelona',3), C=GM.mods.competiciones; let n=0;
while(!st.temporadaTerminada&&n<400){ C.jugarDia(st); n++; }
console.log('dias',n,'copas:',Object.entries(st.copas).map(([k,c])=>k+':'+c.estado+(c.campeon?'->'+c.campeon:'')).join(' | '));
console.log('historial',st.historial.map(h=>h.comp+':'+h.campeon).join(', '));
const gc=st.calendario.filter(g=>g.fase==='copa'); console.log('partidos de copa',gc.length,'jugados',gc.filter(g=>g.resultado).length,'fechas',[...new Set(gc.map(g=>g.fecha))].slice(0,6).join(','));
const dup={}; let d=0; st.calendario.forEach(g=>[g.local,g.visitante].forEach(t=>{const k=g.fecha+t; if(dup[k]) d++; dup[k]=1;})); console.log('dobles reservas',d);
const rv=GM.mods.rivalidades.rivalesDe(st,'fc-barcelona').slice(0,3).map(r=>r.nombre+':'+JSON.stringify(r.hist)); console.log('rivales',rv.join(' | '));
console.log(st.noticias.filter(x=>/Clásico|Derbi/.test(x.texto)).slice(0,2).map(x=>x.texto));
C.nuevaTemporada(st); console.log('2ª temporada copas:',Object.values(st.copas).map(c=>c.estado).join(','));
