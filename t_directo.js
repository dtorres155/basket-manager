const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document; global.performance=global.performance||require('perf_hooks').performance;
global.requestAnimationFrame = f => setTimeout(()=>f(Date.now()), 5); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
let renders=0; THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){renders++;} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador']);
console.log('selfTest',GM.mods.directo.selfTest());
GM.kit.disponible=()=>true;
const st=GM.newGame('fc-barcelona',3); const C=GM.mods.competiciones;
// avanzar hasta el día del partido
const g=C.proximoPartido(st,'fc-barcelona'); while(st.fecha<g.fecha) C.jugarDia(st);
let fin=null; const ctl=GM.mods.directo.abrir(st,g,{control:true,onFin:r=>{fin=r;}});
const $=(sel,txt)=>[...document.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  $('.dir-ctrl button','Empezar').click(); await sleep(30);
  $('.dir-ctrl button','Rápido').click();
  for(let q=0;q<6&&!fin;q++){ await sleep(900); 
    const sig=$('.dir-ctrl button','Siguiente cuarto')||$('.dir-ctrl button','Terminar');
    if($('.dir-panel button','Pedir tiempo')) { $('.dir-panel button','Pedir tiempo').click(); const rap=$('.dir-panel .tab','Muy rápido'); if(rap) rap.click(); const cb=document.querySelector('.dir-panel .jug'); if(cb) cb.click(); }
    console.log('estado: marcador',document.querySelector('.dir-num').textContent,'| reloj',document.querySelector('.dir-reloj').textContent,'| botón',sig?sig.textContent:'(jugando)','| ticker',document.querySelector('.dir-linea')?document.querySelector('.dir-linea').textContent.slice(0,60):'');
    if(sig) { sig.click(); }
  }
  await sleep(200);
  console.log('resultado entregado',!!fin, fin&&fin.local+'-'+fin.visitante, 'cuartos',fin&&fin.cuartos.length);
  st._directo={[g.id]:fin}; C.jugarDia(st); const gg=st.calendario.find(x=>x.id===g.id); console.log('partido registrado',gg.resultado.local,gg.resultado.visitante,'renders',renders);
  process.exit(0);
})();
