const fs=require('fs');
function ed(f,pairs){ let s=fs.readFileSync(f,'utf8'); for(const [a,b] of pairs){ if(!s.includes(a)) throw new Error(f+' falta '+a.slice(0,50)); s=s.replace(a,()=>b);} fs.writeFileSync(f,s); }
ed('texturas.js',[["t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;","t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = GM.campus && GM.campus.config.nivel === 'bajo' ? 1 : 4;\n      if (GM.campus && GM.campus.config.nivel === 'bajo' && t.image && t.image.width > 512) { try { const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(t.image, 0, 0, 512, 512); t.image = c; t.needsUpdate = true; } catch (e) { } }   // Bajo: texturas de 512"]]);
ed('ui.js',[
["      GM.ui.tutorial ? h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { cerrarModales(); navegar('inicio');","      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: ajustesModal }, 'Ajustes gráficos y de sonido'),\n      GM.ui.tutorial ? h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { cerrarModales(); navegar('inicio');"],
["  function menuJuego() {",
`  // Ajustes gráficos y de sonido: nivel de calidad (bajo, medio, alto, ultra; docs/PRESUPUESTOS.md) y sonido. Los cambios gráficos valen al abrir de nuevo el mundo 3D.
  function ajustesModal() {
    const CP = GM.campus, DESC = { bajo: 'Móvil flojo: sin sombras, mitad de gente, texturas de 512', medio: 'Móvil o PC modesto: sin sombras en tiempo real', alto: 'PC: sombras del sol, cielo HDRI y oclusión en interiores', ultra: 'PC potente: sombras lejanas, oclusión en todo y más resolución' };
    const cuerpo = h('div', null), pintar = () => {
      cuerpo.replaceChildren(h('h3', null, 'Ajustes'), h('p', { class: 'muted' }, 'Calidad gráfica'),
        h('div', { class: 'lista' }, (CP ? CP.NIVELES : []).map(n => h('button', { class: 'btn ' + (CP.config.nivel === n ? '' : 'btn-sec'), style: { textAlign: 'left', marginBottom: '6px' }, onclick: () => { CP.setNivel(n); toast('Calidad ' + n + ': se aplica al abrir de nuevo el mundo 3D'); pintar(); } }, h('b', null, n.charAt(0).toUpperCase() + n.slice(1)), h('div', { class: 'muted' }, DESC[n])))),
        GM.sonido ? h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { const on = GM.sonido.alternar(); toast(on ? 'Sonido activado' : 'Sonido desactivado'); } }, 'Activar o silenciar el sonido') : null);
    };
    pintar(); modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function menuJuego() {`]]);
