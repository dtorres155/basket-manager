const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','personaje','carrera','social','sponsor','pueblo']);
console.log('selfTest',GM.mods.sponsor.selfTest());
GM.rng.seed(8); const st=GM.newGame('unicaja',4,{modo:'carrera',personaje:{nombre:'Marc'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'dinero'}});
const S=GM.mods.sponsor,K=GM.mods.carrera,C=GM.mods.competiciones;
for(let y=0;y<4;y++){ while(!st.temporadaTerminada) { C.jugarDia(st); K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,0)); }
  const cs=S.categorias(st); const abiertas=cs.filter(k=>k.ofertas.length);
  console.log(st.temporada,'grado',K.gradoFama(st.carrera).nombre,'| categorías abiertas',abiertas.map(k=>k.cat).join(',')||'ninguna','| activos',S.activos(st).map(s=>s.cat+':'+s.importe).join(' '));
  abiertas.slice(0,2).forEach(k=>{ const r=S.firmar(st,k.cat,k.ofertas[0].id); });
  const o=st.carrera.ofertas.find(x=>x.tipo==='Renovación')||st.carrera.ofertas[0]; if(o) K.aceptar(st,o.id); C.nuevaTemporada(st); }
console.log('ahorros',Math.round(st.carrera.dinero),'sponsors',S.activos(st).length);
