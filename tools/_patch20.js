const fs=require('fs');
function ed(f,pairs){ let s=fs.readFileSync(f,'utf8'); for(const [a,b] of pairs){ if(!s.includes(a)) throw new Error(f+' falta '+a.slice(0,50)); s=s.replace(a,()=>b);} fs.writeFileSync(f,s); }
ed('build.js',[["// Ciudades reales (OpenStreetMap, ODbL)","// Cielos HDRI (Poly Haven, CC0): vendor/hdri -> dist/hdri; se piden por fetch en calidad alta y no van a la caché de arranque\nif (fs.existsSync(path.join(VENDOR, 'hdri'))) { fs.mkdirSync(path.join(DIST, 'hdri'), { recursive: true }); fs.readdirSync(path.join(VENDOR, 'hdri')).filter(f => /\.hdr$/.test(f)).forEach(f => fs.copyFileSync(path.join(VENDOR, 'hdri', f), path.join(DIST, 'hdri', f))); }\n// Ciudades reales (OpenStreetMap, ODbL)"]]);
ed('sede3d.js',[
["  function tonoCiudad(st) {",
`  // Cielos HDRI de Poly Haven (CC0) en calidad alta: dia, nublado, tarde y noche. Se cargan una vez (PMREM) y se elige uno según el sol y el clima; sin ellos queda el cielo procedural.
  const HDRI = {};
  function cieloHDRI(nombre) {
    if (HDRI[nombre] !== undefined) return HDRI[nombre];
    HDRI[nombre] = null;   // en curso
    if (!THREE.RGBELoader || typeof fetch === 'undefined') return null;
    new THREE.RGBELoader().load('hdri/' + nombre + '.hdr', t => { try { t.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(S ? S.renderer : null), e = pm.fromEquirectangular(t); pm.dispose(); t.dispose(); HDRI[nombre] = e.texture; if (S) S.hdriK = null; } catch (er) { HDRI[nombre] = false; } }, undefined, () => { HDRI[nombre] = false; });
    return null;
  }
  function elegirHDRI() {
    if (!S || S.envK !== 'ext' || !(GM.campus && GM.campus.config.calidad === 'alta') || (typeof window !== 'undefined' && window.__sinHDRI)) return;
    const C = S.clima || { tipo: 'sol' }, nombre = S.noche > 0.55 ? 'noche' : (S.solElev < 0.3 || S.noche > 0) ? 'tarde' : C.tipo === 'lluvia' || C.tipo === 'nubes' ? 'nublado' : 'dia';
    if (S.hdriK === nombre) return;
    const t = cieloHDRI(nombre); if (!t) return;
    S.hdriK = nombre; S.scene.environment = t; S.hdriBase = { dia: 0.9, nublado: 0.85, tarde: 0.8, noche: 0.5 }[nombre]; S.envBase = S.hdriBase * 0.45;
  }
  function tonoCiudad(st) {`],
["actualizarCielo(); if (S.scene.environment)","if (!S.hdriK) { actualizarCielo(); } elegirHDRI(); if (S.scene.environment)"]]);
