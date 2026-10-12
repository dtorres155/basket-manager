/* Luz y ambiente del mundo 3D (sede, calle, pueblo, interiores): cielo de reflejos (procedural o HDRI de Poly Haven, CC0), tono por ciudad,
   sol real (sol.js), hora, clima y exposición. Se separó de sede3d.js: GM.sedeLuz({ S: () => escena activa, exterior: () => bool }) devuelve { entorno, aplicarAmbiente, tonoCiudad, mezcla }. */
(function () {
  GM.sedeLuz = function (ctx) {
    // Entorno (reflejos y luz ambiente realista): un cielo de verdad en exteriores y una sala neutra en interiores; se calcula una vez por tipo
    function entorno() {
      const S = ctx.S();
      const r = S.renderer, interior = ['sede', 'casa', 'interior'].indexOf(S.escena) >= 0, k = interior ? 'int' : 'ext'; if (S.envK === k) return;
      try {
        const pm = new THREE.PMREMGenerator(r); let tex;
        if (interior && THREE.RoomEnvironment) tex = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
        else if (THREE.Sky) { const sky = new THREE.Sky(), u = sky.material.uniforms, sc = new THREE.Scene(); sky.scale.setScalar(1000); u.turbidity.value = 5; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8; const el = Math.max(0.3, S.solElev == null ? 0.55 : S.solElev); S.envElev = el; u.sunPosition.value.setFromSphericalCoords(1, Math.PI / 2 - el, S.solAzim == null ? 3.5 : Math.PI - S.solAzim); sc.add(sky); tex = pm.fromScene(sc).texture; }
        pm.dispose(); if (!tex) return; if (S.scene.environment) S.scene.environment.dispose(); S.scene.environment = tex; S.envK = k; S.envBase = interior ? 0.4 : 0.3; S.scene.environmentIntensity = S.envBase;
      } catch (e) { S.envK = k; }
    }
    // Tono de cada ciudad: más cálido y luminoso en el Mediterráneo, más frío y neutro en el centro de Europa, nítido en EE. UU.
    const TONOS = { med: { sol: 0xffecc8, cielo: 0xe2e9f2, exp: 0.95 }, centro: { sol: 0xf1f3ff, cielo: 0xd0dbe8, exp: 0.88 }, us: { sol: 0xfff4e4, cielo: 0xdfe9f5, exp: 0.92 } };
    // Al cambiar la altura del sol más de 0,1 rad se recalcula el cielo de reflejos (un PMREM pequeño, solo en exteriores)
    function actualizarCielo() {
      const S = ctx.S();
      if (!S.scene.environment || S.envK !== 'ext' || S.envElev == null || Math.abs(Math.max(0.3, S.solElev) - S.envElev) < 0.1 || S.noche > 0.6) return;
      const antes = S.scene.environment; S.envK = null; entorno(); if (S.scene.environment !== antes) { antes.dispose(); S.scene.environmentIntensity = S.envBase; } else S.envK = 'ext';
    }
    // Cielos HDRI de Poly Haven (CC0) en calidad alta: dia, nublado, tarde y noche. Se cargan una vez (PMREM) y se elige uno según el sol y el clima; sin ellos queda el cielo procedural.
    const HDRI = {};
    function cieloHDRI(nombre) {
      if (HDRI[nombre] !== undefined) return HDRI[nombre];
      HDRI[nombre] = null;   // en curso
      if (!THREE.RGBELoader || typeof fetch === 'undefined') return null;
      new THREE.RGBELoader().load('hdri/' + nombre + '.hdr', t => { try { t.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(ctx.S() ? ctx.S().renderer : null), e = pm.fromEquirectangular(t); pm.dispose(); t.dispose(); HDRI[nombre] = e.texture; if (ctx.S()) ctx.S().hdriK = null; } catch (er) { HDRI[nombre] = false; } }, undefined, () => { HDRI[nombre] = false; });
      return null;
    }
    function elegirHDRI() {
      const S = ctx.S();
      if (!S || S.envK !== 'ext' || !(GM.campus && GM.campus.config.calidad === 'alta') || (typeof window !== 'undefined' && window.__sinHDRI)) return;
      const C = S.clima || { tipo: 'sol' }, nombre = S.noche > 0.55 ? 'noche' : (S.solElev < 0.3 || S.noche > 0) ? 'tarde' : C.tipo === 'lluvia' || C.tipo === 'nubes' ? 'nublado' : 'dia';
      if (S.hdriK === nombre) return;
      const t = cieloHDRI(nombre); if (!t) return;
      S.hdriK = nombre; S.scene.environment = t; S.hdriBase = { dia: 0.9, nublado: 0.85, tarde: 1.1, noche: 0.5 }[nombre]; S.envBase = S.hdriBase * 0.45;
    }
    function tonoCiudad(st) { const p = (st.equipos[st.clubId] || {}).pais; return TONOS[p === 'US' ? 'us' : ['DE', 'LT', 'RS', 'FR'].indexOf(p) >= 0 ? 'centro' : 'med']; }

    // La luz depende de la hora (9:00 a 23:00; una hora de juego dura 40 s reales) y del ambiente del día
    const _cA = new THREE.Color(), _cB = new THREE.Color();
    function mezcla(a, b, t) { return _cA.setHex(a).lerp(_cB.setHex(b), Math.max(0, Math.min(1, t))).getHex(); }
    function aplicarAmbiente() {
      const S = ctx.S();
      if (!S.luces || !S.dia) return;
      const h = S.hora || 9, SO = GM.mods.sol, hs = SO ? SO.horaSolar(S.st, h) : h, sp = SO ? SO.salidaPuesta(SO.latitud(S.st), S.st.fecha) : { sale: 7, pone: 20 }, tarde = Math.max(0, Math.min(1, (hs - (sp.pone - 2.5)) / 2.5)), noche = Math.max(0, Math.min(1, Math.max((hs - (sp.pone - 0.5)) / 1.5, (sp.sale + 0.5 - hs) / 1.2))), triste = S.dia.tipo === 'derrota' ? 0.72 : S.dia.tipo === 'victoria' ? 1.08 : 1;
      S.noche = noche;
      { const pz = SO ? SO.posicion(SO.latitud(S.st), S.st.fecha, hs) : null; S.solElev = pz ? pz.elev : 0.9; S.solAzim = pz ? pz.azim : null; }   // altura real del sol: baja en invierno y al caer la tarde
      S.luces.sol.intensity = (2.6 * (1 - noche) + 0.7 * noche) * triste * (SO ? Math.max(0.55, Math.min(1, (S.solElev + 0.04) / 0.45)) : 1);
      const T0 = tonoCiudad(S.st);
      S.luces.sol.color.setHex(noche > 0 ? mezcla(0xffa060, 0x8fa6d6, noche) : mezcla(S.dia.tipo === 'derrota' ? 0xd9e2f0 : T0.sol, 0xffa060, tarde));
      S.luces.cielo.intensity = ((S.scene.environment ? 0.55 : 1.1) * (1 - noche) + 0.5 * noche) * triste;
      S.luces.cielo.color.setHex(mezcla(T0.cielo, 0x5a6c9a, noche)); if (S.escena === 'pueblo') { S.luces.sol.intensity *= 1.25; S.luces.cielo.intensity *= 0.8; }
      S.expObj = T0.exp * (1 - noche * 0.12) * (S.solElev < 0.15 && !noche ? 1 + (0.15 - S.solElev) * 0.5 : 1);   // el ojo se adapta: la exposición se acerca poco a poco a este valor
      if (!S.hdriK) { actualizarCielo(); } elegirHDRI(); if (S.scene.environment) S.scene.environmentIntensity = (S.envBase || 0.5) * (1 - noche * 0.75) * triste;
      if (S.grado) S.grado.uniforms.calido.value = 0.65 * (1 - noche * 0.5);
      if (S.bloom) { S.bloom.enabled = noche > 0.05; S.bloom.strength = noche * 0.5; S.bloom.threshold = 2.4 - noche * 1.5; }
      if (S.escena === 'calle' || S.escena === 'pueblo') { const f = noche > 0 ? mezcla(0xf0a46a, 0x101a2e, noche) : mezcla(0xb2cce2, 0xf0a46a, tarde); S.scene.background = new THREE.Color(f); if (S.scene.fog) S.scene.fog.color.setHex(f); }
      else S.scene.background = new THREE.Color(noche > 0 ? mezcla(0xf0a46a, 0x101a2e, noche) : mezcla(0x9fb8c8, 0xf0a46a, tarde));
      if (S.farolas) { S.farolas.emissiveIntensity = 0.4 + noche * 3.5; }
      if (S.charcosNoche) S.charcosNoche.opacity = noche * 0.9;
      if (S.ventanas) S.ventanas.forEach(m => { m.emissiveIntensity = (m.emissiveMap ? 1.3 : 0.25) * Math.max(0, Math.min(1, (h - 19) / 1.5)); });
      { const C = S.clima || { tipo: 'sol' }, ext = ctx.exterior(), gris = ext ? (C.tipo === 'lluvia' ? 0.75 : C.tipo === 'nubes' ? 0.42 : 0) : 0;
        if (gris) { const gn = gris * (1 - noche * 0.6), gc = new THREE.Color(0x8f99a4).lerp(new THREE.Color(0x283040), noche); S.luces.sol.intensity *= 1 - gn * 0.72; S.luces.cielo.color.lerp(new THREE.Color(0xa3acb6), gn * 0.6); if (S.scene.background && S.scene.background.isColor) S.scene.background.lerp(gc, gn * 0.85); if (S.scene.fog) { S.scene.fog.color.lerp(gc, gn * 0.85); if (!S.fogBase) S.fogBase = S.scene.fog.far; S.scene.fog.far = S.fogBase * (1 - gn * 0.35); } if (S.scene.environment) S.scene.environmentIntensity *= 1 - gn * 0.3; }
        if (GM.texturas && GM.texturas.mojadoU) GM.texturas.mojadoU.value = ext ? (C.tipo === 'lluvia' ? 1 : C.ayer ? 0.35 : 0) : 0;
        if (S.chipDia && S.dia && S.clima) S.chipDia.textContent = S.dia.texto + (ext ? '. ' + S.clima.texto : '');
        if (GM.sonido) { const pc = !!(S.dia && S.dia.tipo === 'partido' && S.dia.casa); GM.sonido.estado({ hora: h, clima: C.tipo, partido: pc && h >= 20.4 && h < 22.3, previa: pc && h >= 16 && h < 20.5 }); } }
      if (S.luces.sol2) { const l2 = S.luces.sol2; l2.color.copy(S.luces.sol.color); l2.intensity = S.luces.sol.intensity * 0.4; S.luces.sol.intensity *= 0.6; }
      if (S.chipHora) { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; S.chipHora.textContent = hh + ':' + String(mm).padStart(2, '0'); }
    }
    return { entorno, aplicarAmbiente, tonoCiudad, mezcla };
  };
})();
