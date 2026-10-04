const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document; global.performance=global.performance||require('perf_hooks').performance;
global.requestAnimationFrame = f => setTimeout(()=>f(Date.now()), 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','partidos','competiciones','mercado','cantera','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','copas','continental','rivalidades','entrenador','legado']);
GM.kit.disponible=()=>true; const H=GM.mods.hogar, el=document.getElementById('app'), $=(s,t)=>[...el.querySelectorAll(s)].find(b=>b.textContent.includes(t));
const st=GM.newGame('real-madrid',3,{modo:'presidente',personaje:{nombre:'Ana',apellido:'Roca'}}); st.hogar={ahorros:99999,muebles:{}}; st.ciudad['real-madrid'].mapa=null;
let fallos=0, total=0;
for(const tipo of Object.keys(H.TIPOS).filter(k=>k!=='residencia')) for(let vi=0;vi<H.VARIANTES[tipo].length;vi++){
  const v=H.VARIANTES[tipo][vi]; st.hogar.casa={id:'t-'+tipo+vi,tipo,modo:'compra',barrio:1,barrioNombre:'__'+vi+'__',ciudad:'Madrid',precio:100,alquiler:1};
  // forzar la variante deseada
  const real=H.casaActual(st); if(real.variante!==v){ // buscar nombre de barrio que dé esta variante
    for(let k=0;k<200;k++){ st.hogar.casa.barrioNombre='b'+k; if(H.casaActual(st).variante===v) break; } }
  try{
    GM.mods.hogar3d.mount(el,st); total++;
    for(const vista of ['Fuera','Edificio']){ $('.panel3d .tab',vista).click(); }
    const habs=H.habitaciones(tipo,v); for(const hb of habs){ $('.panel3d .tab',hb.nombre).click(); const cat=H.catalogo(st,hb.id,'f-0-0').filter(i=>i.disponible&&i.tam===1)[0]; if(cat) H.colocar(st,hb.id,'f-0-0',cat.id); const cat2=H.catalogo(st,hb.id,'f-0-'+(hb.cols-2)).filter(i=>i.disponible&&i.tam===2)[0]; if(cat2) H.colocar(st,hb.id,'f-0-'+(hb.cols-2),cat2.id); }
    GM.mods.hogar3d.mount(el,st); $('.panel3d .tab','Habitaciones'); GM.mods.hogar3d.unmount();
    console.log('ok',v.nombre.padEnd(26),habs.map(r=>r.id+' '+r.cols+'x'+r.rows).join(', '));
  }catch(e){ fallos++; console.log('ERR',tipo,v.nombre,e.message); }
}
// usar muebles
const c=H.casaActual(st); const hab=H.habitaciones(c.tipo,c.variante)[0].id; ['cama2','sofa2','tv2','escritorio','pizarra'].forEach((id,i)=>{ H.colocar(st,hab,'f-1-'+(i), id)}); 
const usos=H.muebles(st).filter(m=>m.hab===hab).map(m=>m.slot+':'+m.item+'->'+JSON.stringify(H.usar(st,hab,m.slot)).slice(0,90)); console.log(usos.slice(0,5).join('\n'));
console.log('casas probadas',total,'fallos',fallos); process.exit(0);
