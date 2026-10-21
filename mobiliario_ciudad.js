/* MOBILIARIO URBANO Y VEGETACIÓN POR CIUDAD (punto 77, GM.mobiliario) — cada país tiene su juego de colores y de objetos de calle, hechos por código (nada descargado):
   - PAISES: paletas de bancos, papeleras y contenedores (España: reciclaje verde, amarillo y azul; Francia: verde; Alemania: seis colores de reciclaje; Turquía y Grecia: azul y verde), color de buzones y de marquesinas, y especies de árbol
     que se plantan (mediterráneo: olivo, ciprés, pino y palmera; centro y norte de Europa: abeto y abedul; de la ciudad de cada club según su país).
   - paleta(st): paleta del país del club; la usa calle_real_detalle.js para colorear bancos, papeleras y contenedores.
   - Objetos nuevos: buzon(pais), cabina(pais), valla(largo), señal(tipo), palmera(), abeto(), abedul(), flores(color, n), contenedorReciclaje(color), kioscoFlores(). Cada uno devuelve un grupo de Three.
   - conjunto(pais) lista lo que lleva una calle de ese país; selfTest. Expone: PAISES, paleta, especies, conjunto, buzon, cabina, valla, senal, palmera, abeto, abedul, flores, contenedorReciclaje, selfTest. */
(function () {
  const PAISES = {
    ES: { banco: ['#5a4630', '#3a3f45', '#6b4a2f'], papelera: ['#2f4f3a', '#3a3f45', '#4a4f55'], contenedor: ['#2e6b3a', '#d4a017', '#2f6f9e'], buzon: '#f2c500', marquesina: '#2a2f35', especies: ['olivo', 'cipres', 'pino', 'palmera'] },
    FR: { banco: ['#3a3f45', '#5a4630', '#2f4f3a'], papelera: ['#2e6b3a', '#3a3f45', '#2e6b3a'], contenedor: ['#2e6b3a', '#d4a017', '#2f6f9e'], buzon: '#f2c500', marquesina: '#2a2f35', especies: ['frutal', 'cipres', 'pino'] },
    DE: { banco: ['#5a4630', '#2f4f3a', '#3a3f45'], papelera: ['#3a3f45', '#2f6f9e', '#d4a017'], contenedor: ['#2f6f9e', '#d4a017', '#5a4630'], buzon: '#f2c500', marquesina: '#2a2f35', especies: ['abedul', 'abeto', 'frutal'] },
    GR: { banco: ['#f4f4f4', '#3a3f45', '#5a4630'], papelera: ['#2f6f9e', '#3a3f45', '#2f6f9e'], contenedor: ['#2f6f9e', '#2e6b3a', '#d4a017'], buzon: '#f2c500', marquesina: '#2f6f9e', especies: ['olivo', 'cipres', 'pino', 'palmera'] },
    TR: { banco: ['#3a3f45', '#2f6f9e', '#5a4630'], papelera: ['#2f6f9e', '#3a3f45', '#2e6b3a'], contenedor: ['#2e6b3a', '#2f6f9e', '#d4a017'], buzon: '#f2c500', marquesina: '#2f6f9e', especies: ['pino', 'cipres', 'frutal', 'palmera'] },
    IT: { banco: ['#5a4630', '#3a3f45', '#2f4f3a'], papelera: ['#2e6b3a', '#3a3f45', '#4a4f55'], contenedor: ['#2e6b3a', '#d4a017', '#2f6f9e'], buzon: '#e30613', marquesina: '#2a2f35', especies: ['pino', 'cipres', 'olivo'] },
    LT: { banco: ['#5a4630', '#3a3f45', '#2f4f3a'], papelera: ['#3a3f45', '#2e6b3a', '#2f6f9e'], contenedor: ['#2e6b3a', '#d4a017', '#2f6f9e'], buzon: '#f2c500', marquesina: '#2a2f35', especies: ['abedul', 'abeto', 'pino'] },
    _: { banco: ['#5a4630', '#3a3f45', '#6b4a2f'], papelera: ['#2f4f3a', '#3a3f45', '#4a4f55'], contenedor: ['#2e6b3a', '#d4a017', '#2f6f9e'], buzon: '#f2c500', marquesina: '#2a2f35', especies: ['frutal', 'pino', 'cipres'] }
  };
  const pais = st => { const e = st && st.equipos && st.equipos[st.clubId]; return (e && e.pais) || '_'; };
  const juego = p => PAISES[p] || PAISES[String(p).slice(0, 2)] || PAISES._;
  const paleta = st => juego(typeof st === 'string' ? st : pais(st));
  const especies = st => paleta(st).especies;
  const conjunto = p => ({ bancos: true, papeleras: true, contenedores: true, buzones: true, cabinas: p === 'ES' || p === 'IT', marquesinas: true, flores: true, especies: juego(p).especies });
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {}));
  const caja = (g, w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  const cil = (g, r1, r2, h, m, x, y, z, seg) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  function buzon(p) { const g = new THREE.Group(), c = juego(p).buzon; cil(g, 0.02, 0.02, 1.2, mat('#3a3f45'), 0, 0.6, 0, 6); caja(g, 0.5, 0.45, 0.3, mat(c), 0, 1.3, 0); caja(g, 0.4, 0.04, 0.02, mat('#111'), 0, 1.4, 0.16); return g; }
  function cabina(p) { const g = new THREE.Group(), c = p === 'ES' ? '#1d4f91' : '#2f6f9e'; caja(g, 0.9, 2.2, 0.9, mat(c, { roughness: 0.4 }), 0, 1.1, 0); caja(g, 0.7, 1.4, 0.04, mat('#bfdcee', { transparent: true, opacity: 0.4, roughness: 0.1 }), 0, 1.3, 0.47); caja(g, 0.95, 0.08, 0.95, mat('#222'), 0, 2.24, 0); return g; }
  function valla(largo) { const g = new THREE.Group(), n = Math.max(2, Math.round((largo || 4) / 1.5)), m = mat('#3a3f45', { metalness: 0.5 }); for (let i = 0; i <= n; i++) cil(g, 0.03, 0.03, 1.0, m, -largo / 2 + i * largo / n, 0.5, 0, 6); caja(g, largo, 0.04, 0.04, m, 0, 0.95, 0); caja(g, largo, 0.04, 0.04, m, 0, 0.45, 0); return g; }
  function senal(tipo) {
    const g = new THREE.Group(), cols = { ceda: ['#ffffff', '#c8102e'], stop: ['#c8102e', '#ffffff'], prohibido: ['#ffffff', '#c8102e'], obligatorio: ['#1d4f91', '#ffffff'], parking: ['#1d4f91', '#ffffff'], peaton: ['#1d4f91', '#ffffff'] }[tipo || 'obligatorio'] || ['#1d4f91', '#ffffff'];
    cil(g, 0.025, 0.025, 2.2, mat('#7a7f85', { metalness: 0.5 }), 0, 1.1, 0, 6); const d = cil(g, 0.32, 0.32, 0.03, mat(cols[0]), 0, 2.1, 0.03, tipo === 'stop' ? 8 : 20); d.rotation.x = Math.PI / 2; const i = cil(g, 0.22, 0.22, 0.035, mat(cols[1]), 0, 2.1, 0.04, tipo === 'stop' ? 8 : 20); i.rotation.x = Math.PI / 2; return g;
  }
  const hoja = (g, c, r, x, y, z, s) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(c, { roughness: 0.9 })); m.position.set(x, y, z); if (s) m.scale.set(1, s, 1); m.castShadow = true; g.add(m); };
  function palmera() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) cil(g, 0.16 - i * 0.012, 0.18 - i * 0.012, 1.0, mat('#8a6f4a'), Math.sin(i) * 0.05, 0.5 + i * 0.98, 0, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, f = caja(g, 0.18, 0.04, 2.2, mat('#3f7a3a'), Math.cos(a) * 1.0, 6.2, Math.sin(a) * 1.0); f.rotation.y = -a + Math.PI / 2; f.rotation.x = 0.35; } return g; }
  function abeto() { const g = new THREE.Group(); cil(g, 0.14, 0.2, 1.2, mat('#5a4630'), 0, 0.6, 0); for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.5 - i * 0.26, 1.7, 10), mat('#2f5a3a', { roughness: 0.9 })); c.position.y = 1.7 + i * 1.0; c.castShadow = true; g.add(c); } return g; }
  function abedul() { const g = new THREE.Group(), tr = mat('#e9e6df'); cil(g, 0.08, 0.12, 4.6, tr, 0, 2.3, 0, 6); [[0, 5.2, 0, 1.3], [0.7, 4.5, 0.2, 0.9], [-0.7, 4.7, -0.3, 1.0]].forEach(p => hoja(g, '#8fb04a', p[3], p[0], p[1], p[2], 1.2)); return g; }
  function flores(color, n) { const g = new THREE.Group(); caja(g, 1.4, 0.3, 0.5, mat('#6b4a2f'), 0, 0.15, 0); for (let i = 0; i < (n || 12); i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(i % 3 ? color || '#e8b6c8' : '#f6e05a')); m.position.set(-0.6 + (i % 6) * 0.24, 0.36, -0.15 + Math.floor(i / 6) * 0.3); g.add(m); } return g; }
  function contenedorReciclaje(c) { const g = new THREE.Group(); caja(g, 1.1, 1.15, 0.9, mat(c || '#2e6b3a'), 0, 0.58, 0); caja(g, 1.12, 0.06, 0.92, mat('#2a2f35'), 0, 1.18, 0); return g; }
  function selfTest() { return juego('ES').especies.indexOf('palmera') >= 0 && juego('LT').especies.indexOf('abeto') >= 0 && paleta({ clubId: 'x', equipos: { x: { pais: 'DE' } } }).especies[0] === 'abedul' && paleta(null).banco.length === 3; }
  GM.mobiliario = { PAISES, paleta, especies, conjunto, buzon, cabina, valla, senal, palmera, abeto, abedul, flores, contenedorReciclaje, selfTest };
  GM.register && GM.register('mobiliario', GM.mobiliario);
})();
