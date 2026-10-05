async function arrancar(d,sleep,modo,liga,club){
  const $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
  $('button','Nueva partida').click(); await sleep(10);
  $('.hoja .liga',modo==='presidente'?'Presidente':'Director técnico').click(); await sleep(15);
  d.querySelector('.hoja input[placeholder="Nombre"]').value='Marc'; $('.hoja button','Continuar').click(); await sleep(15);
  $('.liga',liga).click(); $('.club',club).click(); $('.hoja button','Dirigir').click(); await sleep(15);
  if(modo==='presidente'){ [...d.querySelectorAll('.hoja .item')].slice(0,2).forEach(b=>b.click()); $('.hoja button','Empezar').click(); }
  await sleep(300);
}
const fs=require('fs');const { JSDOM } = require('jsdom');
let html=fs.readFileSync('dist/index.html','utf8').replace(/<script src="https:[^>]*><\/script>/,'').replace(/<link[^>]*>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/',beforeParse(w){
  w.THREE=require('./tools/three_node');
  w.THREE.WebGLRenderer=class{constructor(){this.domElement=w.document.createElement('canvas');}setPixelRatio(){}setSize(){}setClearColor(){}render(){}dispose(){}forceContextLoss(){}};
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document;
setTimeout(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
  await arrancar(d,sleep,'gestor','ACB','Joventut');
  const GM=w.GM,st=GM.state; st.finanzas[st.clubId].caja=5e7;
  GM.ui.navegar('ciudad'); console.log('ciudad tabs:',[...d.querySelectorAll('.tabs .tab')].map(b=>b.textContent).join('|'));
  $('.tabs .tab','Mapa').click(); await sleep(20);
  console.log('mapa panel:', d.querySelector('.panel3d').textContent.slice(0,150));
  [...d.querySelectorAll('.panel3d .seg .tab')].find(b=>b.textContent.includes('Llefià')).click();
  const hacer=[...d.querySelectorAll('.panel3d .btn.peq')].find(b=>!b.disabled); console.log('acciones visibles',d.querySelectorAll('.panel3d .btn.peq').length); hacer.click(); await sleep(20);
  console.log('toast', [...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|'), 'caja cabecera', d.querySelector('.cab-c b').textContent);
  GM.ui.navegar('finanzas'); $('.tabs .tab','Contratos').click(); console.log('contratos:', d.querySelector('.cuerpo').textContent.slice(0,260));
  const of=[...d.querySelectorAll('.cuerpo .item.col')].find(b=>b.tagName==='BUTTON'); of.click(); await sleep(10);
  console.log('modal:', d.querySelector('.hoja').textContent.slice(0,140)); $('.hoja button','Firmar').click(); await sleep(20);
  console.log('tras firmar:', d.querySelector('.cuerpo').textContent.slice(0,200));
  const resc=$('.cuerpo button','Rescindir'); if(resc){ resc.click(); await sleep(10); console.log('rescindir modal:', d.querySelector('.hoja').textContent.slice(0,120)); d.querySelectorAll('.fondo').forEach(f=>f.remove()); }
  for (const id of ['inicio','plantilla','mercado','calendario','club','ciudad','finanzas']) { GM.ui.navegar(id); const e=d.querySelector('.aviso.mal'); if(e) errs.push(id+': '+e.textContent); }
  console.log('ERRORES',errs);
  process.exit(0);
},500);
