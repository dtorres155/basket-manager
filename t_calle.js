const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document;
global.requestAnimationFrame = f => setTimeout(f, 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
let renders=0; THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){renders++;} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans']);
GM.kit.disponible=()=>true;
const el=document.getElementById('app'); let fallos=0;
for (const club of ['joventut-badalona','fc-barcelona','real-madrid','unicaja','los-angeles-lakers','olympiacos']) {
  const st=GM.newGame(club,4); st.finanzas[club].caja=1e9;
  const C3=GM.mods.ciudad3d; C3.mount(el,st);
  const btn=t=>[...el.querySelectorAll('.panel3d button')].find(b=>b.textContent.includes(t));
  try {
    btn('Calle').click();
    for (const b of C3.barrios(st)) { [...el.querySelectorAll('.panel3d .tab')].find(x=>x.textContent===b.nombre).click(); }
    btn('Noche').click(); btn('Día').click(); btn('Mapa').click(); btn('Afición').click();
    [...el.querySelectorAll('.panel3d .tab')][2].click();
    console.log(club,'ciudad ok');
  } catch(e){ fallos++; console.log(club,'ERR',e.message); }
  C3.unmount();
  // estadio exterior e interior
  const E=GM.mods.estadio; E.mount(el,st);
  try { const b2=t=>[...el.querySelectorAll('.panel3d button')].find(b=>b.textContent.includes(t)); b2('Exterior').click(); b2('Noche de partido').click(); b2('Interior').click(); console.log('  estadio ok'); } catch(e){ fallos++; console.log('  estadio ERR',e.message); }
  E.unmount();
}
console.log('fallos',fallos,'renders',renders);
setTimeout(()=>process.exit(0),30);
