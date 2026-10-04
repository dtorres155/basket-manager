const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document; global.performance=global.performance||require('perf_hooks').performance;
global.requestAnimationFrame = f => setTimeout(()=>f(Date.now()), 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','partidos','competiciones','mercado','cantera','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','copas','continental','rivalidades','entrenador','legado']);
GM.kit.disponible=()=>true; const P=GM.mods.pueblo, el=document.getElementById('app');
console.log('selfTest',P.selfTest());
GM.rng.seed(3); const st=GM.newGame('unicaja',4,{modo:'carrera',personaje:{nombre:'Marc'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}});
const e0=P.estado(st); console.log('pueblo',e0.nombre,'nivel',e0.nivel,e0.etiqueta,'población',e0.poblacion);
for(const f of [0,25,45,65,90]){ st.carrera.fama=f; st.carrera.pueblo.aportado=f*8; const e=P.estado(st); st.carrera.dinero=5000;
  P.mount(el,st); const cant=el.querySelectorAll('.panel3d .item').length; P.unmount();
  const ed=P.edificios(st).filter(b=>!b.motivo&&b.proximo); ed.forEach(b=>P.invertir(st,b.tipo));
  console.log('fama',f,'->',e.etiqueta,'| casas visibles ~',6+e.nivel*9,'| construibles',ed.map(b=>b.tipo).join(','),'| nivel tras invertir',P.estado(st).nivel); }
console.log('acciones',JSON.stringify(P.visitar(st)),JSON.stringify(P.visitar(st)),JSON.stringify(P.usar(st,'canasta')).slice(0,100));
st.carrera.pueblo.nivel=1; for(let i=0;i<40;i++) GM.mods.competiciones.jugarDia(st);
P.mount(el,st); console.log('panel:',el.querySelector('.panel3d').textContent.slice(0,120)); P.unmount(); process.exit(0);
