const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','personaje','carrera','social','sponsor','pueblo']);
const K=GM.mods.carrera, C=GM.mods.competiciones;
GM.rng.seed(21); const st=GM.newGame('unicaja',4,{modo:'carrera',personaje:{nombre:'Marc',apellido:'Soler'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}});
const c=st.carrera;
function temporada(){ let n=0; while(!st.temporadaTerminada&&n<400){ C.jugarDia(st); n++; K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,0)); } }
console.log('inicio fama',Math.round(c.fama*10)/10,K.gradoFama(c).nombre);
for(let y=0;y<8;y++){
  temporada(); const g=K.gradoFama(c), e=K.estatusClub(st), p=st.jugadores.yo;
  console.log(st.temporada,'club',p.equipoId,'ovr',p.ovr,'edad',p.edad,'| fama',c.fama.toFixed(1),g.nombre,'| estatus',e&&e.nombre,e&&Math.round(e.pts),'| ofertas',c.ofertas.map(o=>o.liga[0]+o.liga[1]+':'+o.clubId.slice(0,5)+(o.impacto?'*':'')).join(','));
  // aceptar la renovación o la mejor
  const ren=c.ofertas.find(o=>o.tipo==='Renovación'); let el=ren; if(y===3){ el=c.ofertas.slice().sort((a,b)=>K.NIVEL[b.liga]-K.NIVEL[a.liga])[0]; }
  if(el){ const antes=c.fama; const r=K.aceptar(st,el.id); console.log('   acepta',el.tipo,el.liga,el.clubId,'fama',antes.toFixed(1),'->',c.fama.toFixed(1),'estatus nuevo club',(K.estatusClub(st)||{}).nombre); }
  C.nuevaTemporada(st);
}
// guardar y recargar: la fama debe seguir funcionando con el mismo freno
const j=JSON.parse(JSON.stringify(GM.state)); GM.state=j; GM.bus.emit('partida:cargada',{}); const f0=j.carrera.fama; j.carrera.fama=f0+20; console.log('tras recargar: +20 pedidos ->',(j.carrera.fama-f0).toFixed(1),'(debe ser menos de 20)');
// veterano baja de liga
{ const s2=GM.newGame('los-angeles-lakers',5,{modo:'carrera',personaje:{nombre:'Vet'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}}); const c2=s2.carrera; c2._f=90; s2.jugadores.yo.edad=34; s2.jugadores.yo.equipoId='los-angeles-lakers'; s2.equipos['los-angeles-lakers'].plantilla.push('yo'); s2.equipos.unicaja.plantilla=s2.equipos.unicaja.plantilla.filter(i=>i!=='yo'); s2.clubId='los-angeles-lakers'; c2.clubes['los-angeles-lakers']={desde:s2.fecha,temps:5,pts:90};
  c2.ofertas=[{id:'z',clubId:'unicaja',liga:'ACB',tipo:'Contrato profesional',rol:'Titular',salario:1e6,anos:2,nota:''}]; K.aceptar(s2,'z'); console.log('veterano NBA -> ACB: fama',c2.fama.toFixed(0),'estatus',K.estatusClub(s2).nombre); }
// joven sube de liga
{ const s3=GM.newGame('unicaja',6,{modo:'carrera',personaje:{nombre:'Jov'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}}); const c3=s3.carrera; c3._f=50; const a=c3.fama; c3.ofertas=[{id:'z',clubId:'los-angeles-lakers',liga:'NBA',tipo:'Contrato NBA',rol:'Banquillo',salario:3e6,anos:2,nota:''}]; K.aceptar(s3,'z'); console.log('joven ACB -> NBA: fama',a.toFixed(0),'->',c3.fama.toFixed(0)); }
// rival
{ const s4=GM.newGame('fc-barcelona',7,{modo:'carrera',personaje:{nombre:'Tr'},carrera:{origen:'europa',clubId:'fc-barcelona',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}}); const c4=s4.carrera; c4._f=50; c4.clubes['fc-barcelona'].pts=70; const a=c4.fama; c4.ofertas=[{id:'z',clubId:'real-madrid',liga:'EUROLIGA',tipo:'Contrato profesional',rol:'Titular',salario:3e6,anos:2,nota:''}]; console.log('impacto',JSON.stringify(K.impacto(s4,'real-madrid'))); K.aceptar(s4,'z'); console.log('ídolo del Barça -> Real Madrid: fama',a.toFixed(0),'->',c4.fama.toFixed(0)); }
