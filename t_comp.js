const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','partidos','competiciones']);
console.log('selfTest comp', GM.mods.competiciones.selfTest());
GM.rng.seed(1);
let t0=Date.now();
const st = GM.newGame('fc-barcelona', 7);
console.log('newGame ms', Date.now()-t0, 'partidos', st.calendario.length);
const C = GM.mods.competiciones;
// partidos por equipo
const cnt={}; st.calendario.forEach(g=>{cnt[g.local]=(cnt[g.local]||0)+1;cnt[g.visitante]=(cnt[g.visitante]||0)+1;});
console.log('okc',cnt['oklahoma-city-thunder'],'barca',cnt['fc-barcelona'],'unicaja',cnt['unicaja'],'trieste',cnt['trieste']);
// duplicados por dia
const occ={};let dup=0;st.calendario.forEach(g=>{[g.local,g.visitante].forEach(t=>{const k=g.fecha+t;if(occ[k])dup++;occ[k]=1;});});
console.log('dobles reservas',dup);
console.log('primer partido barça',C.proximoPartido(st,'fc-barcelona').fecha, 'ultimo reg', st.calendario.filter(g=>g.local==='fc-barcelona'||g.visitante==='fc-barcelona').slice(-1)[0].fecha);
t0=Date.now(); let days=0;
while(!st.temporadaTerminada && days<420){ C.jugarDia(st); days++; }
console.log('dias',days,'fecha',st.fecha,'terminada',st.temporadaTerminada,'ms',Date.now()-t0);
console.log(JSON.stringify(st.historial));
const sz=JSON.stringify(st).length; console.log('tamaño estado MB',(sz/1e6).toFixed(2));
['NBA','EUROLIGA','ACB','LEGA'].forEach(c=>{const t=C.clasificacion(st,c);console.log(c,t.slice(0,3).map(r=>r.equipoId+' '+r.g+'-'+r.p).join(', '),'| ultimo',t[t.length-1].equipoId+' '+t[t.length-1].g);});
const nba=C.clasificacion(st,'NBA'); console.log('NBA pf medio', (nba.reduce((a,r)=>a+r.pf,0)/nba.reduce((a,r)=>a+r.pj,0)).toFixed(1));
const eu=C.clasificacion(st,'EUROLIGA'); console.log('EURO pf medio', (eu.reduce((a,r)=>a+r.pf,0)/eu.reduce((a,r)=>a+r.pj,0)).toFixed(1));
const po=st.playoffs.NBA; console.log('NBA rondas', po.rondas.map(r=>r.nombre+':'+r.series.length).join(' | '));
console.log('Euro rondas', st.playoffs.EUROLIGA.rondas.map(r=>r.nombre+':'+r.series.length).join(' | '));
const lesionados=Object.values(st.jugadores).filter(p=>p.estado.lesion).length; console.log('lesionados activos',lesionados);
const top=Object.entries(st.estadisticas).sort((a,b)=>b[1].pts/b[1].pj-a[1].pts/a[1].pj).slice(0,5).map(([id,s])=>st.jugadores[id].nombre+' '+(s.pts/s.pj).toFixed(1)+' ('+s.pj+'pj)');console.log(top);
C.nuevaTemporada(st); console.log(st.temporada, st.fecha, st.calendario.length);
