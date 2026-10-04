const { JSDOM } = require('jsdom'); const dom=new JSDOM('<div id=app></div>'); global.window=global; global.document=dom.window.document; global.THREE=require('three/build/three.min.js');
const L=require('./load'); L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans']);
GM.rng.seed(3);
const st=GM.newGame('boston-celtics',3,{modo:'carrera',personaje:{nombre:'Marc',apellido:'Soler'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'dinero'}});
const K=GM.mods.carrera, C3=GM.mods.ciudad3d, C=GM.mods.competiciones;
console.log('club',st.clubId,'ciudad',st.equipos[st.clubId].ciudad,'ahorros',st.carrera.dinero);
console.log('barrios vivienda:',K.barriosVivienda(st).map(b=>b.nombre+' ×'+b.precio+' T'+b.transporte+' R'+b.ruido+' P'+b.prestigio).join(' | '));
let r=K.comprarVivienda(st,2,'atico','compra'); console.log('comprar ático (sin ahorros):',JSON.stringify(r));
st.carrera.fama=70; st.carrera.dinero=2000; r=K.comprarVivienda(st,2,'reformado','alquiler'); console.log('alquilar piso reformado:',JSON.stringify(r),'ahorros',st.carrera.dinero);
r=K.comprarCoche(st,'deportivo'); console.log('coche',JSON.stringify(r)); r=K.crearFundacion(st,'Fundació Soler',4); console.log('fundación',JSON.stringify(r));
const lug=C3.lugares(st); const ac=lug.filter(l=>l.tipo==='colegio').map(l=>C3.acciones(st,l.id).map(a=>a.t+(a.disponible?'':'(no)')).join('/')); console.log('acciones colegio (jugador):',ac.join(' ; '));
const col=lug.find(l=>l.tipo==='colegio'); const f0=st.carrera.fama; console.log('hacer clínic',JSON.stringify(C3.hacer(st,col.id,'clinic')),'fama',f0.toFixed(1),'->',st.carrera.fama.toFixed(1),'| otra vez',JSON.stringify(C3.hacer(st,col.id,'clinic')));
const m0=st.carrera.moral; let n=0; while(!st.temporadaTerminada&&n<300){C.jugarDia(st);n++; K.eventos(st).forEach(e=>K.elegirEvento(st,e.id,0));}
console.log('tras la temporada: ahorros',Math.round(st.carrera.dinero),'moral',Math.round(m0),'->',Math.round(st.carrera.moral),'fama',Math.round(st.carrera.fama));
// cambiar de club: casa en otra ciudad
K.generarOfertas(st); const o=st.carrera.ofertas.find(x=>st.equipos[x.clubId].ciudad!==st.equipos.unicaja.ciudad); if(o){ K.aceptar(st,o.id); console.log('ficha por',st.clubId,st.equipos[st.clubId].ciudad,'| vivienda en',st.carrera.vivienda.actual.ciudad); const pid=st.carrera.vivienda.actual.id; console.log('dejar alquiler',JSON.stringify(K.gestionarPropiedad(st,pid,'dejar'))); }
console.log('selfTest',K.selfTest());
