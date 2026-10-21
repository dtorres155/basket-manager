/* ETIQUETAS Y LUZ DEL MAPA 3D DE CIUDAD (punto 73, GM.etiquetasMapa) — el mapa 3D de Ciudad enseña lo mismo que el mapa 2D del mundo (sede_mapa.js): nombres de barrios, lugares, calles y comercios según la altura de la cámara,
   con la misma luz que el mundo según la hora. Las etiquetas son HTML sobre el lienzo, proyectadas desde el 3D cada 120 ms y repartidas por una rejilla para que no se pisen.
   Niveles por distancia de cámara (radio respecto del máximo): lejos = barrios; medio = barrios, lugares y calles principales; cerca = además calles pequeñas, comercios y edificios con nombre.
   Toca una etiqueta de lugar para seleccionarlo (el mismo gesto que tocar el marcador). La luz: iluminar(vista, hora, st) ajusta la ambiental y el sol (color y altura) como hace el mundo.
   Expone: montar(contenedor, vista, datos), nivel, iluminar, selfTest. Prueba: tools/mapa3d_prueba.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp;
  const nivel = (radio, max) => {
    const k = radio / Math.max(1, max);
    return k > 0.62 ? 0 : k > 0.3 ? 1 : 2;
  };
  // datos: { vec (plano vectorial), zonas: [{ x, z, nombre, id }], barrios: [{ x, z, nombre, aficion }], real, max }
  function montar(cont, v, d) {
    if (!cont || !v || !v.camera) return null;
    const h = GM.h,
      capa = h('div', { class: 'em-capa', 'aria-hidden': 'true' });
    cont.style.position = cont.style.position || 'relative';
    cont.append(capa);
    let vivo = true,
      nivelAct = -1,
      ult = '';
    const proy = (x, z, y) => {
      const p = new THREE.Vector3(x, y || 0, z).project(v.camera),
        r = cont.getBoundingClientRect();
      if (p.z > 1 || p.z < -1) return null;
      return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height, w: r.width, h: r.height };
    };
    function pinta() {
      if (!vivo || !cont.isConnected) {
        vivo = false;
        clearInterval(iv);
        return;
      }
      const mx = d.max || 800,
        niv = nivel(v.radio, mx),
        escala = d.real ? 1 : 0.5,
        clave = [Math.round(v.theta * 20), Math.round(v.phi * 20), Math.round(v.radio), Math.round(v.target.x), Math.round(v.target.z)].join(',');
      if (clave === ult && niv === nivelAct) return;
      ult = clave;
      nivelAct = niv;
      capa.innerHTML = '';
      const celdas = new Set(),
        puesta = (x, y) => {
          const k = Math.round(x / 90) + ',' + Math.round(y / 22);
          if (celdas.has(k)) return false;
          celdas.add(k);
          return true;
        };
      let n = 0;
      const poner = (txt, x, z, cls, alto, onclick) => {
        if (n > 60) return;
        const p = proy(x, z, alto || 0);
        if (!p || p.x < 4 || p.x > p.w - 4 || p.y < 4 || p.y > p.h - 4 || !puesta(p.x, p.y)) return;
        n++;
        capa.append(
          h(
            onclick ? 'button' : 'span',
            { class: 'em-et ' + cls, style: { left: p.x + 'px', top: p.y + 'px' }, onclick: onclick || null },
            txt.length > 26 ? txt.slice(0, 25) + '…' : txt
          )
        );
      };
      (d.barrios || []).forEach(b => poner(b.nombre, b.x, b.z, 'barrio' + (b.aficion >= 60 ? ' bien' : b.aficion < 40 ? ' mal' : ''), 6 * escala));
      if (niv >= 1) (d.zonas || []).forEach(z => poner(z.nombre, z.x, z.z, 'lugar', 14 * escala, z.alClic));
      const VEC = d.vec;
      if (VEC && niv >= 1) {
        const hechos = {};
        VEC.C.forEach(c => {
          if (!c.nom || hechos[c.nom] || (niv === 1 && c.k > 2)) return;
          hechos[c.nom] = 1;
          poner(c.nom, c.mx, c.mz, 'calle', 1);
        });
      }
      if (VEC && niv >= 2) {
        (VEC.N || []).forEach(q => poner(q.nom, q.x, q.z, 'comercio', 3));
        (VEC.B || []).forEach(b => {
          if (b.nom) poner(b.nom, b.cx, b.cz, 'edif', 6);
        });
      }
    }
    const iv = setInterval(pinta, 120);
    pinta();
    return {
      actualizar: () => {
        ult = '';
        pinta();
      },
      dispose: () => {
        vivo = false;
        clearInterval(iv);
        capa.remove();
      }
    };
  }
  // Luz del mapa igual que la del mundo: por hora (usa sol.js si está) con tres tramos: día, atardecer y noche
  function iluminar(v, hora, st) {
    if (!v || !v.scene) return null;
    const T = THREE;
    let amb = null,
      sol = null;
    v.scene.children.forEach(o => {
      if (o.isAmbientLight) amb = o;
      else if (o.isDirectionalLight && !sol) sol = o;
    });
    const SO = GM.mods && GM.mods.sol;
    let elev = clamp(Math.sin(((hora - 6) / 12) * Math.PI), -0.3, 1),
      dir = { x: -0.45, y: 0.84, z: 0.39 };
    try {
      if (SO && st) {
        const d = SO.direccion(SO.latitud(st), st.fecha, SO.horaSolar(st, hora), 0.3);
        if (d) {
          dir = d;
          elev = clamp(d.y, -0.3, 1);
        }
      }
    } catch (e) {
      /* sin sol.js */
    }
    const dia = clamp(elev * 2.2, 0, 1),
      tarde = elev > 0 && elev < 0.4 ? 1 - elev / 0.4 : 0,
      fondo = new T.Color(0x16202e).lerp(new T.Color(0xa9d6f2), dia).lerp(new T.Color(0xf0b27a), tarde * 0.5);
    if (amb) {
      amb.intensity = 0.45 + 0.55 * dia;
      amb.color.set(0xffffff).lerp(new T.Color(0xc6d4ff), 1 - dia);
    }
    if (sol) {
      sol.intensity = 0.15 + 0.95 * dia;
      sol.color.set(0xfff4e0).lerp(new T.Color(0xff9a52), tarde * 0.7);
      sol.position.set(dir.x * 40, Math.max(6, dir.y * 40), dir.z * 40);
    }
    v.scene.background = fondo;
    return { dia: Math.round(dia * 100) / 100, tarde: Math.round(tarde * 100) / 100 };
  }
  function selfTest() {
    return nivel(780, 800) === 0 && nivel(400, 800) === 1 && nivel(120, 800) === 2 && typeof montar === 'function';
  }
  GM.etiquetasMapa = { montar, nivel, iluminar, selfTest };
  GM.register && GM.register('etiquetasMapa', GM.etiquetasMapa);
})();
