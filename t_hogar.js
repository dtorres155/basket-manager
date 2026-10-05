const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document; global.performance=global.performance||require('perf_hooks').performance;
global.requestAnimationFrame = f => setTimeout(()=>f(Date.now()), 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('./tools/three_node');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','partidos','competiciones','mercado','cantera','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','copas','continental','rivalidades','entrenador','legado']);
GM.kit.disponible=()=>true; const H=GM.mods.hogar, el=document.getElementById('app'), $=(s,t)=>[...el.querySelectorAll(s)].find(b=>b.textContent.includes(t));
console.log('selfTests hogar',H.selfTest(),'hogar3d',GM.mods.hogar3d.selfTest());
const casos=[['gestor','joventut-badalona'],['presidente','real-madrid'],['entrenador','manresa'],['carrera-europa','unicaja'],['carrera-nba','los-angeles-lakers']];
for(const [modo,club] of casos){
  GM.rng.seed(5);
  let st;
  if(modo.startsWith('carrera')){ st=GM.newGame(club,3,{modo:'carrera',personaje:{nombre:'Marc',apellido:'Soler',piel:2,pelo:3},carrera:{origen:'europa',clubId:club==='unicaja'?'unicaja':'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'dinero'}}); if(modo==='carrera-nba'){ st.carrera.fama=85; const o={id:'x',clubId:'los-angeles-lakers',liga:'NBA',tipo:'Contrato NBA',rol:'Titular',salario:2e7,anos:3,nota:''}; st.carrera.ofertas=[o]; GM.mods.carrera.aceptar(st,'x'); st.carrera.dinero=9000; } }
  else st=GM.newGame(club,3,{modo,personaje:{nombre:'Marc',apellido:'Soler'}});
  const casa=H.casaActual(st); const n=H.nivel(st);
  console.log('\n==',modo,club,'| nivel',n,H.etiquetaNivel(st),'| casa',casa.nombre,'| ahorros',Math.round(H.dinero(st)),'| tipos disponibles',H.tipos(st).filter(t=>t.disponible).map(t=>t.id).join(','));
  GM.mods.hogar3d.mount(el,st);
  for(const v of ['Fuera','Edificio','Habitaciones']){ const b=$('.panel3d .tab',v); if(b) b.click(); }
  const habs=H.habitaciones(casa.tipo); console.log(' habitaciones:',habs.map(h=>h.id).join(','));
  // colocar muebles disponibles y bloqueados
  const cat=H.catalogo(st,habs[0].id,'f-0-0'); const bloq=cat.filter(i=>!i.disponible).length, ok=cat.filter(i=>i.disponible).length;
  let puestos=0; H.catalogo(st,habs[0].id,'f-0-0').filter(i=>i.disponible&&i.tam===1).slice(0,2).forEach((it,k)=>{ const r=H.colocar(st,habs[0].id,'f-0-'+(k*2),it.id); if(r.ok) puestos++; });
  console.log(' catálogo salón/estudio: disponibles',ok,'bloqueados',bloq,'| colocados',puestos,'| efectos',JSON.stringify(H.efectos(st)));
  GM.mods.hogar3d.mount(el,st); $('.panel3d .tab',habs[0].nombre)&&$('.panel3d .tab',habs[0].nombre).click();
  if(modo!=='carrera-europa'){ const r=H.mudarse(st,1,'mansion','compra'); console.log(' mudarse a mansión:',JSON.stringify(r)); }
  GM.mods.hogar3d.unmount();
}
// carrera: pasa de nivel
const st=GM.newGame('unicaja',3,{modo:'carrera',personaje:{nombre:'Marc'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'dinero'}});
console.log('\ncarrera inicial nivel',H.nivel(st),'-> con fama 90 en ACB',(st.carrera.fama=90,H.nivel(st)));
console.log('mudarse a ático con nivel',H.nivel(st),JSON.stringify(H.mudarse(st,1,'atico','compra')));

{ const s=GM.newGame('real-madrid',3,{modo:'presidente',personaje:{nombre:'Ana'}}); console.log('hipoteca mansión (presidente):',JSON.stringify(H.mudarse(s,1,'mansion','hipoteca')),'casa',H.casaActual(s).nombre,'modo',H.casaActual(s).modo,'ahorros',Math.round(H.dinero(s)));
  for(let d=0;d<70;d++) GM.mods.competiciones.jugarDia(s); console.log('tras 2 meses ahorros',Math.round(H.dinero(s))); }
process.exit(0);
