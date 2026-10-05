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
  w.THREE=require('three/build/three.min.js');
  w.THREE.WebGLRenderer=class{constructor(){this.domElement=w.document.createElement('canvas');}setPixelRatio(){}setSize(){}setClearColor(){}render(){}dispose(){}forceContextLoss(){}};
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document;
setTimeout(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
  await arrancar(d,sleep,'presidente','ACB','Joventut');
  const GM=w.GM, st=GM.state; console.log('modo',st.modo,'club',st.clubId,'pilares',JSON.stringify(st.legado.pilares),'nav',[...d.querySelectorAll('.navb span')].map(s=>s.textContent).join('/'));
  const chk=(n)=>{const e=d.querySelector('.aviso.mal'); if(e) errs.push(n+': '+e.textContent);};
  for (const id of ['inicio','plantilla','directiva','calendario','club','ciudad','legado','finanzas']) { GM.ui.navegar(id); chk(id); }
  // jugar un mes con decisiones por UI
  for (let i=0;i<60;i++){ GM.mods.competiciones.jugarDia(st); }
  GM.ui.navegar('legado'); console.log('legado:', d.querySelector('.cuerpo').textContent.slice(0,140));
  const op=[...d.querySelectorAll('.cuerpo .tarjeta .lista button')][0]; if(op){ op.click(); await sleep(10); console.log('toast:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|')); }
  GM.ui.navegar('directiva'); console.log('directiva:', d.querySelector('.cuerpo').textContent.slice(0,160));
  const v=$('.cuerpo button','Vetar'); if(v){ v.click(); await sleep(10); console.log('veto toast:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|')); }
  GM.ui.navegar('inicio'); console.log('inicio:', d.querySelector('.cuerpo').textContent.slice(0,200));
  GM.ui.navegar('club'); [...d.querySelectorAll('.tabs .tab')].forEach((b,i)=>{ b.click(); chk('club'+i); });
  console.log('estadio panel:', d.querySelector('.panel3d')? d.querySelector('.panel3d').textContent.slice(0,120):'-');
  // temporada completa en modo presidente
  let n=0; while(!st.temporadaTerminada&&n<400){ GM.mods.competiciones.jugarDia(st); GM.mods.legado.dilemas(st).forEach(x=>GM.mods.legado.resolver(st,x.id,0)); n++; }
  GM.ui.navegar('legado'); console.log('fin temp legado:', d.querySelector('.cuerpo').textContent.slice(-220));
  console.log('guardar', JSON.stringify(GM.mods.guardado.guardar(1)));
  console.log('ERRORES', errs, 'tamaño estado MB', (JSON.stringify(st).length/1e6).toFixed(2));
  process.exit(0);
},500);
