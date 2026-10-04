const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','rivalidades','personaje','carrera','social']);
const K=GM.mods.carrera, C=GM.mods.competiciones;
for (const sal of ['uni','prof','filial']) {
  GM.rng.seed(31); const st=GM.newGame('fc-barcelona',4,{modo:'carrera',personaje:{nombre:'Joan',apellido:'Pons'},carrera:{origen:'cadete',clubId:'fc-barcelona',pos:'PG',perfil:'creador',nac:'ES',agente:'prestigio'}});
  const c=st.carrera, p=st.jugadores.yo; console.log('\n== salida',sal,'| fase',c.fase,c.etapa,'edad',p.edad,'ovr',p.ovr+'/'+p.pot,'club',st.clubId,'retrato',JSON.stringify(K.retrato(st)).slice(0,120));
  for(let y=0;y<9;y++){
    if(c.fase==='retirado') break;
    let n=0; while(!st.temporadaTerminada&&n<400){ C.jugarDia(st); n++; K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,0)); }
    console.log(' ',st.temporada,'fase',c.fase,c.etapa||'','edad',p.edad,'ovr',p.ovr,'club',p.equipoId||'-','hist',(c.historial.slice(-1)[0]||{}).liga,'ofertas',c.ofertas.map(o=>o.tipo.slice(0,14)).join('|'));
    if(c.ofertas.length){ const pick = sal==='uni'?c.ofertas.find(o=>o.tipo==='Universidad'):sal==='filial'?(c.ofertas.find(o=>o.tipo==='Seguir en el filial')||c.ofertas[0]):(c.ofertas.find(o=>/^Primer/.test(o.tipo))||c.ofertas.find(o=>o.liga!=='NCAA')); if(pick){ const r=K.aceptar(st,pick.id); console.log('   acepta',pick.tipo,'->fase',c.fase,c.etapa||''); } }
    if(c.fase==='ncaa'&&c.etapa==='universidad'&&c.curso>=2) K.declararse(st);
    C.nuevaTemporada(st);
  }
}
