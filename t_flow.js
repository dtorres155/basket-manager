const fs=require('fs');const { JSDOM } = require('jsdom');
let html=fs.readFileSync('dist/index.html','utf8').replace(/<script src="https:[^>]*><\/script>/,'').replace(/<link[^>]*>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/',beforeParse(w){
  w.THREE=require('three/build/three.min.js');
  w.THREE.WebGLRenderer=class{constructor(){this.domElement=w.document.createElement('canvas');}setPixelRatio(){}setSize(){}setClearColor(){}render(){}dispose(){}forceContextLoss(){}};
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document, sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=(sel,txt)=>[...d.querySelectorAll(sel)].find(b=>b.textContent.includes(txt));
const modo=process.argv[2]||'carrera-ncaa'; const ES_E = modo==='entrenador';
setTimeout(async()=>{
  $('button','Nueva partida').click(); await sleep(10);
  const op={ 'gestor':'Director técnico','presidente':'Presidente','carrera-ncaa':'Carrera de jugador','carrera-europa':'Carrera de jugador','carrera-cadete':'Carrera de jugador','entrenador':'Entrenador','carrera-cadete':'Carrera de jugador'}[modo];
  $('.hoja .liga',op).click(); await sleep(20);
  console.log('creador:', d.querySelector('.hoja h3').textContent, 'avatar svg', !!d.querySelector('.hoja svg'));
  d.querySelector('.hoja input[placeholder="Nombre"]').value='Marc'; d.querySelector('.hoja input[placeholder="Apellido"]').value='Soler';
  [...d.querySelectorAll('.hoja .seg')][2].querySelectorAll('.tab')[3].click(); // barba
  $('.hoja button','Continuar').click(); await sleep(20);
  if(modo.startsWith('carrera','fans')){
    console.log('jugador modal:', d.querySelector('.hoja h3').textContent);
    const ori=[...d.querySelectorAll('.hoja .item')].find(b=>b.textContent.includes(modo==='carrera-ncaa'?'Universidad':modo==='carrera-cadete'?'Cadete':'Liga europea')); ori.click();
    $('.hoja button','Continuar').click(); await sleep(30);
    if(modo==='carrera-europa'||modo==='carrera-cadete'){ $('.liga','ACB').click(); $('.club','Unicaja').click(); $('.hoja button','Empezar aquí').click(); await sleep(300); }
    else await sleep(300);
  } else {
    $('.liga','ACB').click(); $('.club','Joventut').click(); $('.hoja button','Dirigir').click(); await sleep(20);
    if(modo==='presidente'){ [...d.querySelectorAll('.hoja .item')].slice(0,2).forEach(b=>b.click()); $('.hoja button','Empezar').click(); }
    await sleep(300);
  }
  const GM=w.GM, st=GM.state; console.log('modo',st.modo,'club',st.clubId,'personaje',st.personaje&&st.personaje.nombre,'fase',st.carrera&&st.carrera.fase,'nav',[...d.querySelectorAll('.navb span')].map(s=>s.textContent).join('/'));
  const ids=[...d.querySelectorAll('.navb')].map(b=>b.getAttribute('data-id')); const chk=n=>{const e=d.querySelector('.aviso.mal'); if(e) errs.push(n+': '+e.textContent);};
  for(const id of ids){ GM.ui.navegar(id); chk(id); [...d.querySelectorAll('.tabs .tab')].forEach((b,i)=>{b.click();chk(id+'#'+i);}); }
  console.log('pantallas ok');
  // jugar la temporada completa por la interfaz
  let n=0; while(!st.temporadaTerminada&&n<500){ GM.ui.navegar('inicio'); const b=[...d.querySelectorAll('.cuerpo button')].find(b=>/Jugar partido|Hasta el día|Avanzar hasta el final|Hasta el final/.test(b.textContent)); if(!b) break; b.click(); d.querySelectorAll('.fondo').forEach(f=>f.remove()); const ev=[...d.querySelectorAll('.cuerpo .tarjeta .btn-sec')]; n++; if(st.modo==='carrera'){ GM.mods.carrera.eventos(st).forEach(e=>GM.mods.carrera.elegirEvento(st,e.id,0)); } if(st.modo==='entrenador'){ GM.mods.entrenador.eventos(st).forEach(x=>GM.mods.entrenador.elegirEvento(st,x.id,0)); } if(st.modo==='presidente'){ GM.mods.legado.dilemas(st).forEach(x=>GM.mods.legado.resolver(st,x.id,0)); } }
  console.log('temporada terminada',st.temporadaTerminada,'clicks',n);
  if(st.modo==='carrera'){ const c=st.carrera; console.log('fase tras la temporada:',c.fase,'club',st.clubId,'ofertas',c.ofertas.length,'hist',c.historial.map(h=>h.liga).join(',')); GM.ui.navegar('agente'); console.log('agente:',d.querySelector('.cuerpo').textContent.slice(0,160)); GM.ui.navegar('trayectoria'); console.log('carrera:',d.querySelector('.cuerpo').textContent.slice(0,140));
    if(c.ofertas.length){ GM.ui.navegar('agente'); const it=d.querySelector('.cuerpo .lista button.item'); if(it){ it.click(); await sleep(10); console.log('oferta modal:',d.querySelector('.hoja').textContent.slice(0,100)); $('.hoja button','Aceptar').click(); await sleep(10); console.log('tras aceptar club',st.clubId,'fase',st.carrera.fase); } }
    GM.ui.navegar('inicio'); const nb=[...d.querySelectorAll('.cuerpo button')].find(b=>/Empezar curso|Empezar temporada/.test(b.textContent)); if(nb){ nb.click(); await sleep(10); d.querySelectorAll('.hoja button').forEach(b=>{ if(/decida mi representante/.test(b.textContent)) b.click(); }); }
    console.log('nueva temporada',st.temporada,'fase',st.carrera.fase,'club',st.clubId);
  }
  if(st.modo==='entrenador'){ const c=st.entrenador; console.log('entrenador: fase',c.fase,'conf',Math.round(c.confianza),'ofertas',c.ofertas.length,'hist',c.historial.length); GM.ui.navegar('junta'); console.log('directiva:',d.querySelector('.cuerpo').textContent.slice(0,170)); const pb=[...d.querySelectorAll('.cuerpo button')].find(b=>b.textContent==='Pedir'); if(pb){pb.click(); await sleep(10); console.log('petición:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|')); } const co=[...d.querySelectorAll('.cuerpo button')].find(b=>/Contratar/.test(b.textContent)); if(co){co.click(); await sleep(10); console.log('ayudante:',[...d.querySelectorAll('.toast')].map(x=>x.textContent).join('|')); } GM.ui.navegar('trayectoria'); console.log('carrera:',d.querySelector('.cuerpo').textContent.slice(0,150)); GM.ui.navegar('inicio'); const nb=[...d.querySelectorAll('.cuerpo button')].find(b=>/Empezar temporada/.test(b.textContent)); if(nb){ nb.click(); await sleep(10); d.querySelectorAll('.hoja button').forEach(b=>{ if(/Seguir como estoy/.test(b.textContent)) b.click(); }); } console.log('nueva temporada',st.temporada,'club',st.clubId); }
  console.log('guardar',JSON.stringify(GM.mods.guardado.guardar(1)),'ERRORES',errs);
  process.exit(0);
},500);
