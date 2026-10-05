const fs=require('fs');const { JSDOM } = require('jsdom');
let html=fs.readFileSync('dist/index.html','utf8').replace(/<script src="https:[^>]*><\/script>/,'').replace(/<link[^>]*>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/',beforeParse(w){
  w.THREE=require('three/build/three.min.js');
  w.THREE.WebGLRenderer=class{constructor(){this.domElement=w.document.createElement('canvas');}setPixelRatio(){}setSize(){}setClearColor(){}render(){}dispose(){}forceContextLoss(){}};
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document, sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
setTimeout(async()=>{
  const modo=process.argv[2];
  $('button','Nueva partida').click(); await sleep(10);
  $('.hoja .liga',modo==='carrera'?'Carrera de jugador':'Presidente').click(); await sleep(15);
  d.querySelector('.hoja input[placeholder="Nombre"]').value='Marc'; $('.hoja button','Continuar').click(); await sleep(15);
  if(modo==='carrera'){ [...d.querySelectorAll('.hoja .item')].find(b=>b.textContent.includes('Liga europea')).click(); $('.hoja button','Continuar').click(); await sleep(20); $('.liga','Bundesliga').click(); $('.club','Ulm').click(); $('.hoja button','Empezar aquí').click(); await sleep(300); }
  else { $('.liga','Liga turca').click(); $('.club','Galatasaray').click(); $('.hoja button','Dirigir').click(); await sleep(20); [...d.querySelectorAll('.hoja .item')].slice(0,2).forEach(b=>b.click()); $('.hoja button','Empezar').click(); await sleep(300); }
  w.GM.kit.disponible=()=>true; const GM=w.GM, st=GM.state; console.log('modo',st.modo,'club',st.clubId,'ligas',GM.ligasDe(st,st.clubId).join('+'));
  const chk=n=>{const e=d.querySelector('.aviso.mal'); if(e) errs.push(n+': '+e.textContent);};
  GM.ui.navegar('ciudad'); const tabs=[...d.querySelectorAll('.tabs .tab')].map(b=>b.textContent); console.log('pestañas de ciudad:',tabs.join('|'));
  for (let i=0;i<tabs.length;i++){ [...d.querySelectorAll('.tabs .tab')][i].click(); chk('ciudad#'+i); }
  if(modo==='carrera'){
    [...d.querySelectorAll('.tabs .tab')].find(b=>b.textContent==='Vivienda').click();
    [...d.querySelectorAll('.cuerpo .lista button')][2].click(); await sleep(10); console.log('modal barrio:',d.querySelector('.hoja h3').textContent);
    [...d.querySelectorAll('.hoja .btn.peq')].find(b=>b.textContent.includes('Alquilar')).click(); await sleep(10); console.log('toast:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|'),'| vivienda',JSON.stringify(st.carrera.vivienda.actual&&st.carrera.vivienda.actual.tipo));
    [...d.querySelectorAll('.tabs .tab')].find(b=>b.textContent==='Estilo de vida').click(); [...d.querySelectorAll('.cuerpo .btn.peq')].find(b=>b.textContent==='Comprar').click(); await sleep(10); console.log('coche',JSON.stringify(st.carrera.vivienda.coche));
    [...d.querySelectorAll('.tabs .tab')].find(b=>b.textContent==='Mapa 3D').click(); [...d.querySelectorAll('.panel3d .seg .tab')].find(b=>b.textContent.includes('Calle')).click(); chk('calle');
  } else {
    [...d.querySelectorAll('.tabs .tab')].find(b=>b.textContent==='Afición').click(); console.log('afición:',d.querySelector('.cuerpo').textContent.slice(0,150));
    [...d.querySelectorAll('.cuerpo .btn')].find(b=>b.textContent.includes('Económico')||true); $('.tabs .tab','Afición'); [...d.querySelectorAll('.cuerpo .item.col')][0].click(); await sleep(10); console.log('peña modal:',d.querySelector('.hoja h3').textContent); [...d.querySelectorAll('.hoja .btn.peq')].find(b=>!b.disabled).click(); await sleep(10); console.log('toast:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|'));
    [...d.querySelectorAll('.tabs .tab')].find(b=>b.textContent==='Identidad').click(); d.querySelector('.cuerpo input[placeholder="Nombre de la mascota"]').value='Bruno'; $('.cuerpo button','Guardar identidad').click(); await sleep(10); console.log('mascota',JSON.stringify(st.fans.identidad.mascota));
    GM.ui.navegar('club'); $('.tabs .tab','Ciudad deportiva')&&$('.tabs .tab','Ciudad deportiva').click(); await sleep(10); console.log('club panel:',d.querySelector('.panel3d').textContent.slice(0,80));
  }
  for(const id of [...d.querySelectorAll('.navb')].map(b=>b.getAttribute('data-id'))){ GM.ui.navegar(id); chk(id); }
  let n=0; while(!st.temporadaTerminada&&n<500){ GM.ui.navegar('inicio'); const b=[...d.querySelectorAll('.cuerpo button')].find(b=>/Jugar partido|Hasta el día|Hasta el final|Avanzar hasta el final/.test(b.textContent)); if(!b) break; b.click(); d.querySelectorAll('.fondo').forEach(f=>f.remove()); n++; if(st.modo==='presidente'){ GM.mods.legado.dilemas(st).forEach(x=>GM.mods.legado.resolver(st,x.id,0)); GM.mods.fans.peticiones(st).forEach(q=>GM.mods.fans.resolverPeticion(st,q.id,0)); } else GM.mods.carrera.eventos(st).forEach(e=>GM.mods.carrera.elegirEvento(st,e.id,0)); }
  console.log('temporada terminada',st.temporadaTerminada,'clicks',n,'guardar',JSON.stringify(GM.mods.guardado.guardar(1)),'ERRORES',errs);
  process.exit(0);
},500);
