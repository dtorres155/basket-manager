async function arrancar(d,sleep,modo,liga,club){
  const $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
  $('button','Nueva partida').click(); await sleep(10);
  $('.hoja .liga',modo==='presidente'?'Presidente':'Director técnico').click(); await sleep(15);
  d.querySelector('.hoja input[placeholder="Nombre"]').value='Marc'; $('.hoja button','Continuar').click(); await sleep(15);
  $('.liga',liga).click(); $('.club',club).click(); $('.hoja button','Dirigir').click(); await sleep(15);
  if(modo==='presidente'){ [...d.querySelectorAll('.hoja .item')].slice(0,2).forEach(b=>b.click()); $('.hoja button','Empezar').click(); }
  await sleep(300);
}
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.requestAnimationFrame = f => setTimeout(f, 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('./tools/three_node');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans','ui','ui_gestion','ui_ciudad','ui_presidente','ui_carrera','ui_entrenador']);
GM.kit.disponible = () => true;
const app = document.getElementById('app');
GM.ui.start(app);
console.log('menu:', app.textContent.slice(0,80));
// elegir liga/club via funciones de UI
setTimeout(async ()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await arrancar(document,sleep,'gestor','Euroliga','Barcelona');
  console.log('estado', !!GM.state, 'cuerpo', !!app.querySelector('.cuerpo'));
  const err=[]; const ids=['inicio','plantilla','mercado','calendario','club','ciudad','finanzas'];
  const tabs={plantilla:['plantilla','tactica','cantera'],mercado:['libres','clubes','contratos'],calendario:['partidos','tabla','playoffs','lideres'],club:['cd','est']};
  function chk(n){ const e=app.querySelector('.aviso.mal'); if(e) err.push(n+': '+e.textContent); console.log(n, 'ok, chars', app.querySelector('.cuerpo').textContent.length); }
  for(const id of ids){ GM.ui.navegar(id); chk(id);
    if(tabs[id]) for(const t of tabs[id]){ document.querySelectorAll('.tab').forEach(b=>{}); const tb=[...app.querySelectorAll('.tabs .tab')].find(b=>b.textContent.toLowerCase().startsWith(t.slice(0,4))||false);
      if(tb){tb.click(); chk(id+'/'+t);} } }
  for (const id of ['plantilla','mercado','calendario','club']) { GM.ui.navegar(id); const n=app.querySelectorAll('.tabs .tab').length; for(let i=0;i<n;i++){ app.querySelectorAll('.tabs .tab')[i].click(); const comps=app.querySelectorAll('.seg.compacto .tab'); chk(id+'#'+i); comps.forEach((c,k)=>{ if(k<4){ app.querySelectorAll('.seg.compacto .tab')[k].click(); chk(id+'#'+i+'/c'+k);} }); } }
  // jugar
  GM.ui.navegar('inicio');
  [...app.querySelectorAll('button')].find(b=>/Hasta el día|Jugar partido/.test(b.textContent)).click();
  for(let i=0;i<4;i++){ const b=[...app.querySelectorAll('button')].find(b=>/Jugar partido/.test(b.textContent)); if(!b) break; b.click(); const m=document.querySelector('.hoja'); console.log('resultado modal:', m? m.textContent.slice(0,60):'no'); document.querySelectorAll('.fondo').forEach(f=>f.remove()); const hb=[...app.querySelectorAll('button')].find(b=>/Hasta el día/.test(b.textContent)); if(hb) hb.click(); }
  // modales jugador
  document.querySelectorAll('.fondo').forEach(f=>f.remove());
  GM.ui.navegar('plantilla'); app.querySelector('.tabs .tab').click(); app.querySelector('.jug').click(); console.log('detalle jugador:', document.querySelector('.hoja').textContent.slice(0,80)); 
  [...document.querySelectorAll('.hoja button')].find(b=>b.textContent==='Renovar').click(); await sleep(30); console.log('contrato:', document.querySelector('.hoja').textContent.slice(0,120)); [...document.querySelectorAll('.hoja button')].find(b=>/Proponer/.test(b.textContent)).click(); await sleep(10); console.log('toast:', [...document.querySelectorAll('.toast')].map(x=>x.textContent).join('|'));
  document.querySelectorAll('.fondo').forEach(f=>f.remove());
  GM.ui.navegar('mercado'); app.querySelector('.tabs .tab').click(); app.querySelector('.jug').click(); await sleep(10); console.log('ficha libre:', [...document.querySelectorAll('.hoja button')].map(b=>b.textContent).join('|'));
  document.querySelectorAll('.fondo').forEach(f=>f.remove());
  // menú partida
  app.querySelector('.btn-ic').click(); console.log('menu juego:', document.querySelector('.hoja').textContent.slice(0,80)); document.querySelectorAll('.fondo').forEach(f=>f.remove());
  // avanzar muchos días y refrescar
  for(let i=0;i<40;i++) GM.mods.competiciones.jugarDia(GM.state);
  for(const id of ids){ GM.ui.navegar(id); chk('d40 '+id); }
  for (const [pant,key,val] of [['plantilla','plantilla','tactica'],['mercado','mercado','clubes'],['calendario','calendario','tabla'],['calendario','calendario','lideres'],['calendario','calendario','playoffs']]) { GM.ui.navegar('inicio'); }
  console.log('selfTest ui', GM.mods.ui.selfTest());
  console.log('ERRORES', err);
  process.exit(0);
}, 400);
