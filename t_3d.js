const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document;
global.requestAnimationFrame = f => setTimeout(f, 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
let renders = 0;
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){ renders++; } dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans']);
console.log('selfTests', GM.mods.ciudadDeportiva.selfTest(), GM.mods.estadio.selfTest());
const st = GM.newGame('fc-barcelona', 3);
GM.kit.disponible = () => true;
const el = document.getElementById('app');
for (const m of ['ciudadDeportiva','estadio']) {
  const t0 = Date.now();
  GM.mods[m].mount(el, st);
  console.log(m, 'mount ok ms', Date.now()-t0, 'hijos', el.children.length, 'panel texto', el.querySelector('.panel3d').textContent.slice(0,90));
  GM.mods[m].unmount();
}
// modo sin 3D
GM.kit.disponible = () => false;
GM.mods.ciudadDeportiva.mount(el, st); console.log('sin3d cd', el.querySelector('.vacio') ? 'fallback ok' : 'KO', el.querySelectorAll('button').length, 'botones');
GM.mods.ciudadDeportiva.unmount();
GM.mods.estadio.mount(el, st); console.log('sin3d est', el.querySelectorAll('button').length, 'botones'); GM.mods.estadio.unmount();
// contar meshes en escena de estadio con todas las mejoras
GM.kit.disponible = () => true;
const p = st.instalaciones['fc-barcelona'].pabellon; p.mejoras = ['grada1','grada2','vip','marcador','tienda','cubierta','accesos'];
st.finanzas['fc-barcelona'].caja = 1e9;
GM.mods.estadio.mount(el, st); GM.mods.estadio.unmount();
const cd = GM.mods.ciudadDeportiva; cd.mount(el, st);
console.log('construir parcela', JSON.stringify(cd.construir(st,'fc-barcelona','tienda')));
cd.unmount(); setTimeout(()=>{ console.log('renders', renders); process.exit(0); }, 100);
