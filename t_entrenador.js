const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','personaje','copas','continental','rivalidades','entrenador']);
console.log('selfTest',GM.mods.entrenador.selfTest());
function run(club){
  GM.rng.seed(7); const st=GM.newGame(club,5,{modo:'entrenador',personaje:{nombre:'Marc',apellido:'Soler'}}); const K=GM.mods.entrenador,C=GM.mods.competiciones;
  console.log('\n==',club,'objetivo:',st.entrenador.objetivo.txt,'rep',st.entrenador.reputacion);
  for(let y=0;y<4;y++){
    let n=0; while(!st.temporadaTerminada&&n<400){ C.jugarDia(st); n++; K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,y%2));
      if(n%60===5){ const cand=K.candidatosFichaje(st)[0]; if(cand&&st.entrenador.fase==='activo'){ const r=K.pedirFichaje(st,cand.id); } K.contratar(st,'fisico'); }
      if(st.entrenador.fase==='libre'&&st.entrenador.ofertas.length){ K.aceptar(st,st.entrenador.ofertas[0].id); } }
    const e=st.entrenador; const h=e.historial.slice(-1)[0];
    console.log(' temp',st.temporada,'fase',e.fase,'club',st.clubId,'conf',Math.round(e.confianza),'rep',Math.round(e.reputacion),h?('puesto '+h.puesto+'/'+h.de+' obj '+h.objetivo+' '+(h.cumplido?'OK':'KO')):'-','ofertas',e.ofertas.map(o=>o.tipo[0]+':'+o.clubId.slice(0,6)).join(','));
    C.nuevaTemporada(st);
  }
  console.log(' hitos',st.entrenador.hitos.slice(0,3).map(x=>x.texto).join(' | '));
}
run('unicaja'); run('real-madrid'); run('manresa');
