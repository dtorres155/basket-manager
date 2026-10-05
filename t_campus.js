const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global; global.document = dom.window.document;
global.requestAnimationFrame = f => setTimeout(f, 16); global.cancelAnimationFrame = clearTimeout;
global.THREE = require('./tools/three_node');
THREE.WebGLRenderer = class { constructor(){ this.domElement = document.createElement('canvas'); } setPixelRatio(){} setSize(){} setClearColor(){} render(){} dispose(){} forceContextLoss(){} };
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','copas','continental','rivalidades','directo','entrenador','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d']);
console.log('selfTest cd', GM.mods.ciudadDeportiva.selfTest());
const fakeCtx=new Proxy({}, {get:(o,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):(k in o?o[k]:()=>{}), set:(o,k,v)=>{o[k]=v;return true;}});
if (process.argv[2]==='canvas') { dom.window.HTMLCanvasElement.prototype.getContext = function(){ return fakeCtx; }; }
console.log('modo canvas:', process.argv[2]==='canvas');
const cnt=o=>{let n=0;o.traverse(()=>n++);return n;};
let max=0, errs=0;
for (const t of ['pista','gimnasio','medico','residencia','cantera','tienda','parking','fans','oficinas','historico']) {
  for (let n=1;n<=5;n++){ try{ for (const variante of (t==='emblema'?['masia','ausias','museo','casa']:[undefined])) { const S={c1:0xaa0000,c2:0xffffff,e:GM.campus.estilo({pais:['ES','US','GR','TR'][n%4]}),sig:'ABC',variante}; const m=GM.campus.modelo(t,n,S); const c=cnt(m); max=Math.max(max,c); const o=GM.campus.obra(t,n,0.5,n>1?n-1:0,S); cnt(o); }}catch(e){errs++;console.log('ERR',t,n,e.message);} }
}
console.log('modelos ok, errores',errs,'max meshes por edificio',max);
GM.kit.disponible = () => true;
const el=document.getElementById('app');
for (const club of ['fc-barcelona','joventut-badalona','real-madrid','unicaja','los-angeles-lakers']) {
  const st=GM.newGame(club,5); st.finanzas[club].caja=1e9;
  const cd=GM.mods.ciudadDeportiva;
  GM.mods.ciudadDeportiva.mount(el,st);
  const ps=cd.parcelas(st,club);
  // iniciar obras en las 2 primeras parcelas
  const r=ps.filter(p=>p.estado!=='max').slice(0,2).map(p=>p.nivel?cd.mejorar(st,club,p.slot):cd.construir(st,club,p.slot));
  st.fecha=GM.util.addDays(st.fecha,6);
  GM.state=st; GM.bus.emit('dia:avanzado',{});
  console.log(club,'parcelas',ps.length,'niveles',ps.map(p=>p.slot+':'+p.nivel).join(' '),'obras',JSON.stringify(r.map(x=>x.ok)),'panel:',el.querySelector('.panel3d').textContent.slice(0,70));
  cd.unmount();
}
setTimeout(()=>{
  const st=GM.newGame('joventut-badalona',2); GM.kit.disponible=()=>true; const cd=GM.mods.ciudadDeportiva;
  cd.mount(el,st);
  const btn=t=>[...el.querySelectorAll('.panel3d button')].find(b=>b.textContent.includes(t));
  btn('Noche').click(); btn('Tarde').click(); btn('Día').click();
  btn('Calidad').click(); btn('Calidad').click();
  const emb=cd.parcelas(st,'joventut-badalona').find(p=>p.slot==='emblema'); console.log('emblema Joventut',emb.nivel,emb.estado);
  const st2=GM.newGame('fc-barcelona',2); cd.unmount();
  const e2=cd.parcelas(st2,'fc-barcelona').find(p=>p.slot==='emblema'); console.log('emblema Barça',e2.estado,JSON.stringify(cd.construir(st2,'fc-barcelona','emblema')));
  st2.temporadaTerminada=true; st2.finanzas['fc-barcelona'].caja=1e9; console.log('tras 1ª temporada',JSON.stringify(cd.construir(st2,'fc-barcelona','emblema')));
  process.exit(0);
},100);
