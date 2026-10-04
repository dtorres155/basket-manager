const L = require('./load');
const files=['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','personaje','carrera','fans'];
L(files);
for (const [k,m] of Object.entries(GM.mods)) if (m.selfTest) console.log('selfTest',k, m.selfTest());
const club = process.argv[2]||'fc-barcelona';
const st = GM.newGame(club, 11);
const C=GM.mods.competiciones, M=GM.mods.mercado, F=GM.mods.finanzas;
let t0=Date.now();
function temporada(){ let d=0; while(!st.temporadaTerminada && d<500){ C.jugarDia(st); d++; } return d; }
const d=temporada(); console.log('temporada 1: dias',d,'ms',Date.now()-t0,'fecha',st.fecha);
console.log('campeones',st.historial.map(h=>h.comp+':'+h.campeon).join(', '));
// finanzas del usuario y distribución
const rel=Object.keys(st.equipos).map(id=>({id,rep:st.equipos[id].reputacion,pres:st.equipos[id].presupuesto,caja:st.finanzas[id].caja,ini:Math.round(st.equipos[id].presupuesto*0.25)}));
const ratio=rel.map(r=>(r.caja-r.ini)/r.pres);
console.log('resultado/presupuesto min',Math.min(...ratio).toFixed(2),'max',Math.max(...ratio).toFixed(2),'media',(ratio.reduce((a,b)=>a+b)/ratio.length).toFixed(2));
const u=F.resumen(st,club); console.log('usuario',club,'caja',(u.caja/1e6).toFixed(1),'M ingresos',(u.ingresosTemp/1e6).toFixed(1),'gastos',(u.gastosTemp/1e6).toFixed(1), 'historial',JSON.stringify(st.finanzas[club].historial.map(h=>[h.temporada,Math.round(h.ingresos/1e6),Math.round(h.gastos/1e6)])));
console.log('plantilla usuario',st.equipos[club].plantilla.length,'juveniles',st.cantera[club].juveniles.length, 'libres',st.mercado.libres.length);
const tam=Object.values(st.equipos).map(e=>e.plantilla.length); console.log('tamaños plantilla min/max',Math.min(...tam),Math.max(...tam));
console.log('draft',st.mercado.ultimoDraft&&st.mercado.ultimoDraft.picks.length);
console.log('noticias',st.noticias.slice(0,6).map(n=>n.texto));
// nueva temporada
C.nuevaTemporada(st); console.log('temporada',st.temporada,'fecha',st.fecha);
for(let i=0;i<85;i++) C.jugarDia(st);
console.log('tras verano: fecha',st.fecha,'libres',st.mercado.libres.length,'plantilla usuario',st.equipos[club].plantilla.length);
const tam2=Object.values(st.equipos).map(e=>e.plantilla.length); console.log('tamaños plantilla min/max',Math.min(...tam2),Math.max(...tam2));
const ovrs=Object.values(st.jugadores).filter(p=>p.equipoId&&!p.juvenil).map(p=>p.ovr); console.log('ovr medio liga',(ovrs.reduce((a,b)=>a+b)/ovrs.length).toFixed(1),'max',Math.max(...ovrs));
// pruebas de mercado
const fa=M.libres(st)[0]; console.log('mejor libre',fa.nombre,fa.ovr,fa.edad,'pide',M.salarioPedido(st,fa.id,club));
console.log('tope',JSON.stringify(M.topeSalarial(st,club)));
let r=M.ofertar(st,fa.id,{salario:M.salarioPedido(st,fa.id,club)*1.1,anos:2}); console.log('ofertar',JSON.stringify(r));
const otro=M.buscar(st,{liga:'ACB'})[0]; console.log('comprar',otro.nombre,otro.equipoId,M.precioMinimo(st,otro.id),JSON.stringify(M.comprar(st,otro.id)));
const mio=st.equipos[club].plantilla.map(i=>st.jugadores[i]).sort((a,b)=>a.ovr-b.ovr)[0];
console.log('ofertasVenta',mio.nombre,JSON.stringify(M.ofertasVenta(st,mio.id).slice(0,2)));
console.log('tamaño estado MB',(JSON.stringify(st).length/1e6).toFixed(2));
