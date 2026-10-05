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
  w.HTMLCanvasElement.prototype.getContext=()=>({});
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document;
setTimeout(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  console.log('menu ok:',!!d.querySelector('.menu'),'GM:',!!w.GM);
  await arrancar(d,sleep,'gestor','NBA','Lakers');

  const GM=w.GM,st=GM.state; console.log('club',st.clubId,'ligas',GM.ligasDe(st,st.clubId));
  // Temporada completa por UI
  let n=0;
  while(!st.temporadaTerminada&&n<600){
    const b=[...d.querySelectorAll('.cuerpo button')].find(b=>/Jugar partido|Hasta el día|Avanzar hasta el final/.test(b.textContent));
    if(!b){console.log('sin boton',d.querySelector('.cuerpo').textContent.slice(0,200));break;}
    b.click(); d.querySelectorAll('.fondo').forEach(f=>f.remove()); n++;
  }
  console.log('clicks',n,'fecha',st.fecha,'terminada',st.temporadaTerminada,'campeones',st.historial.map(h=>h.comp+':'+h.campeon).join(','));
  console.log('inicio fin temporada:',d.querySelector('.cuerpo').textContent.slice(0,120));
  [...d.querySelectorAll('.cuerpo button')].find(b=>/Empezar temporada/.test(b.textContent)).click();
  await sleep(20); d.querySelectorAll('.hoja button').forEach(b=>{ if(/igualmente/.test(b.textContent)) b.click(); });
  console.log('nueva',st.temporada,st.fecha,'plantilla',st.equipos[st.clubId].plantilla.length);
  // guardar/cargar
  const g=GM.mods.guardado.guardar(1); console.log('guardar',JSON.stringify(g),'ranuras',GM.mods.guardado.listar().filter(s=>s.club).length);
  console.log('errores window',errs);
  process.exit(0);
},500);
