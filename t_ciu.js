const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document;
global.requestAnimationFrame = f => setTimeout(f, 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('three/build/three.min.js');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d','fans']);
console.log('selfTests', GM.mods.contratos.selfTest(), GM.mods.ciudad3d.selfTest());
GM.kit.disponible=()=>true;
for (const [club,modo] of [['joventut-badalona','presidente'],['fc-barcelona','gestor'],['los-angeles-lakers','gestor'],['real-madrid','presidente']]) {
  const st=GM.newGame(club,3,{modo}); st.finanzas[club].caja=1e9;
  const el=document.getElementById('app'), C3=GM.mods.ciudad3d;
  C3.mount(el,st);
  const l=C3.lugares(st), b=C3.barrios(st);
  const res=l.map(x=>C3.acciones(st,x.id).filter(a=>a.disponible).slice(0,1).map(a=>C3.hacer(st,x.id,a.id).ok)).flat();
  console.log(club,modo,'lugares',l.length,'barrios',b.map(x=>x.nombre+':'+x.aficion).join(' '),'acciones ok',res.filter(Boolean).length+'/'+res.length);
  C3.unmount();
  // contratos
  const K=GM.mods.contratos, cats=K.categorias(st);
  console.log('  contratos', cats.map(c=>c.tipo+':'+(c.activo?c.activo.nombre:'libre')+'/'+c.ofertas.length).join(' | '));
  const r=K.firmar(st,'TV',cats.find(c=>c.tipo==='TV').ofertas[1].id); const r2=K.firmar(st,'Salud',cats.find(c=>c.tipo==='Salud').ofertas[0].id);
  console.log('  firmar TV',r.ok,'firmar Salud',r2.ok,'tras:',K.categorias(st).map(c=>c.tipo+':'+c.ofertas.length+(c.bloqueo?'🔒':'')).join(' '));
}
const st=GM.state; for(let i=0;i<260;i++){ GM.mods.competiciones.jugarDia(st); if(st.temporadaTerminada) break; }
console.log('fin temp', st.temporadaTerminada, 'caja', (st.finanzas[st.clubId].caja/1e6).toFixed(1),'M','patrocinios',st.finanzas[st.clubId].patrocinios.map(p=>p.nombre+' '+Math.round(p.importeAnual/1e3)+'k').join(', '));
process.exit(0);
