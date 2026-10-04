const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','contratos','ciudad3d','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans','legado','directiva_ia']);
console.log('selfTests', GM.mods.legado.selfTest(), GM.mods.directiva.selfTest());
for (const club of ['joventut-badalona','fc-barcelona']) {
  const st=GM.newGame(club,5,{modo:'presidente'});
  const C=GM.mods.competiciones, Lg=GM.mods.legado, D=GM.mods.directiva;
  Lg.fijarPilares(st,['cantera','arraigo']);
  let n=0, resueltos=0, vetos=0;
  while(!st.temporadaTerminada&&n<500){ C.jugarDia(st); n++;
    Lg.dilemas(st).forEach(d=>{ Lg.resolver(st,d.id,GM.rng.int(0,d.opciones.length-1)); resueltos++; });
    D.pendientes(st).forEach(p=>{ if(GM.rng.next()<0.2){ const r=D.vetar(st,p.id); if(r.ok) vetos++; } });
  }
  const l=st.legado;
  console.log(club,'dias',n,'alma',l.alma.toFixed(1),'influencia',l.influencia.toFixed(1),'decisiones',resueltos,'vetos',vetos,'mandato',JSON.stringify(l.mandato.ultima),'camisetas',l.camisetas.length);
  console.log(' directiva',st.directiva.entrenador.perfil,st.directiva.director.perfil,'registro',st.directiva.registro.slice(0,4).map(x=>x.texto).join(' | '));
  console.log(' plantilla',st.equipos[club].plantilla.length,'patrocinios',st.finanzas[club].patrocinios.map(p=>p.nombre).join(', '),'historia',Lg.salaHistoria(st).hitos.length);
  C.nuevaTemporada(st); for(let i=0;i<100;i++){C.jugarDia(st); Lg.dilemas(st).forEach(d=>Lg.resolver(st,d.id,0));}
  console.log(' 2ª temporada plantilla',st.equipos[club].plantilla.length,'caja',(st.finanzas[club].caja/1e6).toFixed(1),'M');
}
// modo gestor sin legado
const g=GM.newGame('fc-barcelona',5); console.log('gestor: legado',!!g.legado,'directiva',!!g.directiva,'modo',g.modo);
