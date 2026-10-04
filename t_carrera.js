const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans']);
console.log('selfTests',GM.mods.personaje.selfTest(),GM.mods.carrera.selfTest());
function carrera(origen,club,opts){
  const st=GM.newGame(club||'los-angeles-lakers',9,{modo:'carrera',personaje:{nombre:'Marc',apellido:'Soler'},carrera:Object.assign({origen,clubId:club,pos:'SG',perfil:'tirador',nac:'ES',agente:'prestigio'},opts||{})});
  return st;
}
function temporada(st,decide){
  const C=GM.mods.competiciones,K=GM.mods.carrera; let n=0;
  while(!st.temporadaTerminada&&n<400){ C.jugarDia(st); n++; K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,0)); if(decide) decide(st,n); }
  return n;
}
for (const [origen,club] of [['ncaa',null],['cantera','fc-barcelona'],['europa','unicaja']]) {
  GM.rng.seed(5);
  const st=carrera(origen,club); const K=GM.mods.carrera, C=GM.mods.competiciones;
  console.log('\n===',origen,'fase',st.carrera.fase,'club',st.clubId,'ovr/pot',st.jugadores.yo.ovr+'/'+st.jugadores.yo.pot,'edad',st.jugadores.yo.edad);
  for (let y=0;y<9;y++){
    if (st.carrera.fase==='retirado') break;
    if (st.carrera.fase==='ncaa'&&y>=1) K.declararse(st); // declararse el 2º año
    temporada(st,(s,n)=>{});
    const c=st.carrera,p=st.jugadores.yo;
    console.log(' temp',st.temporada,'fase',c.fase,'club',p.equipoId||'-', 'liga',K.liga(st)||'-','ovr',p.ovr,'edad',p.edad,'rol',K.rol(st),'ofertas',c.ofertas.map(o=>o.liga+':'+o.clubId.slice(0,8)+':'+o.tipo[0]).join(','), 'hist',c.historial.slice(-1).map(h=>h.liga+' '+h.pts+'p').join(''));
    // decidir: mejor oferta por nivel
    if (c.ofertas.length){ const mejor=c.ofertas.slice().sort((a,b)=>K.NIVEL[b.liga]-K.NIVEL[a.liga])[0]; const r=K.aceptar(st,mejor.id); }
    if (st.carrera.fase==='libre'&&!st.carrera.ofertas.length){ K.generarOfertas(st); const o=st.carrera.ofertas[0]; if(o) K.aceptar(st,o.id); }
    C.nuevaTemporada(st);
    if (p.edad>=35) K.retirarse(st);
  }
  const c=st.carrera; console.log(' fin: fase',c.fase,'dinero',c.dinero,'fama',Math.round(c.fama),'historial',c.historial.map(h=>h.temporada+' '+h.liga).join(' > '));
  console.log(' hitos',c.hitos.slice(0,5).map(h=>h.texto).join(' | '));
}
