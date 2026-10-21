/* ENCARGOS Y MINIJUEGOS EN LA CIUDAD REAL (punto 60, GM.ciudadJuego) — modo carrera. Lleva a la ciudad lo que pueblo_juego.js hace en el pueblo:
   - Canchas de barrio: dos pistas de asfalto con canastas repartidas por la ciudad (se construyen al poblar la calle en un solar libre). En cada una: concurso de triples, tiros libres, uno contra uno callejero
     (los rivales mejoran con tu fama y con la «calle»: reputación callejera de 0 a 100) y un entreno de precisión con una barra que se estrecha, que da progresión.
   - Encargos diarios (1) y semanales (3) con plazo y premio (dinero, fama, ánimo, calle): visitar un sitio de la ciudad, meter triples, ganar un uno contra uno, o llegar a una puntuación de precisión. Sus sitios
     llevan un anillo dorado en la ciudad y en el mapa 3D. Se ven en Ciudad, pestaña Encargos, y en cada cancha.
   - Los concursos del All-Star jugables: si aceptas la invitación al de triples o al de mates, los juegas tú con la barra (allstar.js usa tu resultado en lugar de simularlo).
   Estado: state.carrera.cjuego = { encargos, seq, calle, rec }. Expone: encargos, generar, canchas, marcas, panelEncargos, pendientes, acciones, triples, libres, uno, precision, jugarAllStar, selfTest. Prueba: tools/ciudad_juego_prueba.js, t_ciudad_juego.js. */
(function () {
  const U = GM.util,
    T = THREE,
    clamp = U.clamp,
    k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES');
  const C = st => st.carrera,
    act = st => st && st.modo === 'carrera' && !!st.carrera;
  const PJ = () => GM.puebloJuego;
  const datos = st => {
    const c = C(st);
    return c.cjuego || (c.cjuego = { encargos: [], seq: 0, calle: 20, rec: { triples: 0, libres: 0, precision: 0, uno: 0 } });
  };
  // Sitios que se pueden visitar en la ciudad real (ids de las zonas de calle_real.js)
  const SITIOS = {
    tienda: 'la tienda del club',
    pena: 'el bar de la peña',
    ayuntamiento: 'el ayuntamiento',
    kiosco: 'el quiosco',
    local_restaurante: 'el restaurante',
    local_gimnasio_barrio: 'el gimnasio',
    local_barberia: 'la barbería',
    mercado: 'el mercado',
    heladeria: 'la heladería',
    lugar_hospital: 'el hospital',
    lugar_colegio: 'el colegio',
    lugar_estacion: 'la estación',
    terraza: 'la terraza del café',
    concesionario: 'el concesionario'
  };
  // ---------- Encargos ----------
  const lista = st => datos(st).encargos;
  function nuevo(st, S, diario, usados) {
    const d = datos(st),
      h = U.hash(st.fecha + (diario ? 'd' : 'w') + usados.length + d.seq) >>> 0,
      k = h % 5,
      f = C(st).fama,
      pr = (di, fa, mo, ca) => ({ dinero: Math.round(di * (1 + f / 50) * 10) / 10, fama: fa, moral: mo, calle: ca });
    const cuales = S && S.zonas ? Object.keys(SITIOS).filter(id => S.zonas.some(z => z.sala.id === id) && !usados.some(u => u.tipo === 'visitar' && u.destino === id)) : [];
    const canchas = S && S.zonas ? S.zonas.filter(z => /^cancha_/.test(z.sala.id)) : [];
    if (k === 1)
      return {
        tipo: 'triples',
        n: 4 + ((h >>> 3) % 4),
        texto: 'Mete ' + (4 + ((h >>> 3) % 4)) + ' triples de 10 en una cancha de la ciudad',
        destino: 'cancha',
        premio: pr(0.6, 0.3, 3, 3)
      };
    if (k === 2) return { tipo: 'uno', texto: 'Gana un uno contra uno callejero', destino: 'cancha', premio: pr(0.8, 0.4, 4, 5) };
    if (k === 3)
      return {
        tipo: 'precision',
        n: 6 + ((h >>> 5) % 4),
        texto: 'Saca ' + (6 + ((h >>> 5) % 4)) + ' puntos de 12 en el entreno de precisión',
        destino: 'cancha',
        premio: pr(0.5, 0.25, 3, 2)
      };
    if (cuales.length && k !== 4) {
      const id = cuales[(h >>> 7) % cuales.length];
      return { tipo: 'visitar', destino: id, texto: 'Pásate por ' + SITIOS[id], premio: pr(0.4, 0.1, 2, 1) };
    }
    return { tipo: 'libres', n: 7 + ((h >>> 9) % 2), texto: 'Anota ' + (7 + ((h >>> 9) % 2)) + ' de 10 tiros libres en una cancha', destino: 'cancha', premio: pr(0.4, 0.2, 2, 1) };
  }
  function generar(st, S) {
    if (!act(st)) return;
    const d = datos(st),
      L = d.encargos,
      hoy = st.fecha;
    for (let i = L.length - 1; i >= 0; i--) {
      if (L[i].hasta < hoy) {
        const e = L.splice(i, 1)[0];
        if (!e.hecho) {
          d.calle = clamp(d.calle - 1, 0, 100);
          GM.noticia && GM.noticia(st, 'Se te pasó el plazo de un encargo de la ciudad: ' + e.texto.toLowerCase() + '.');
        }
      }
    }
    const sem = L.filter(e => !e.diario && !e.hecho),
      dia = L.filter(e => e.diario && !e.hecho);
    while (sem.length < 3) {
      const e = nuevo(st, S, false, L);
      e.id = 'c' + ++d.seq;
      e.hasta = U.addDays(hoy, 7);
      L.push(e);
      sem.push(e);
    }
    if (!dia.length) {
      const e = nuevo(st, S, true, L);
      e.id = 'c' + ++d.seq;
      e.diario = true;
      e.hasta = U.addDays(hoy, 1);
      L.push(e);
    }
  }
  function cobrar(st, e) {
    const c = C(st),
      d = datos(st),
      pr = e.premio;
    e.hecho = true;
    if (GM.mods.hogar) GM.mods.hogar.ingresar(st, pr.dinero);
    else c.dinero += pr.dinero;
    if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Encargo de la ciudad: ' + e.texto.toLowerCase(), pr.dinero);
    c.fama = c.fama + pr.fama;
    c.moral = clamp(c.moral + pr.moral, 0, 100);
    d.calle = clamp(d.calle + pr.calle, 0, 100);
    GM.noticia && GM.noticia(st, 'Encargo cumplido: ' + e.texto.toLowerCase() + '. +' + k1(pr.dinero) + ' mil €, calle +' + pr.calle + '.');
    if (GM.ui && GM.ui.toast) GM.ui.toast('Encargo cumplido: ' + e.texto);
    GM.bus.emit('encargo:hecho', { id: e.id, tipo: e.tipo });
  }
  const completa = (st, f) => {
    if (!act(st)) return;
    lista(st).forEach(e => {
      if (!e.hecho && f(e)) cobrar(st, e);
    });
  };
  GM.bus.on('sala:abierta', ({ id }) => {
    const st = GM.state;
    if (!act(st) || !id) return;
    completa(st, e => e.tipo === 'visitar' && e.destino === id);
  });
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (act(st) && st.carrera.cjuego) generar(st, null);
  });
  const pendientes = st => (act(st) ? lista(st).filter(e => !e.hecho).length : 0);
  // ---------- Minijuegos ----------
  const premioPorAciertos = (n, base) => (n >= 8 ? { din: base * 3, fama: 0.4, calle: 3 } : n >= 5 ? { din: base, fama: 0.15, calle: 1.5 } : { din: 0, fama: 0, calle: 0.4 });
  function triples(st, ctx) {
    if (!act(st) || !PJ()) return { ok: false, motivo: 'No disponible.' };
    const c = C(st),
      d = datos(st),
      v = PJ().ventana('Concurso de triples' + (ctx && ctx.nombre ? ': ' + ctx.nombre : ''));
    PJ().ronda(st, v, 'Concurso de triples', 10, 'tiro3', 0.95, 'Tira cuando el cursor pase por la zona verde (o pulsa la barra espaciadora).', n => {
      const p = premioPorAciertos(n, 0.4);
      c.moral = clamp(c.moral + (n >= 5 ? 3 : 1), 0, 100);
      c.fama += p.fama;
      d.calle = clamp(d.calle + p.calle, 0, 100);
      if (p.din) {
        GM.mods.hogar.ingresar(st, p.din);
        if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Concurso de triples de la calle', p.din);
      }
      if (st.jugadores.yo) st.jugadores.yo.xp = (st.jugadores.yo.xp || 0) + 0.02;
      d.rec.triples = Math.max(d.rec.triples, n);
      completa(st, e => e.tipo === 'triples' && n >= e.n);
      v.marcador.innerHTML = '<span>Resultado</span><b>' + n + ' de 10</b>';
      v.msg.textContent = (n >= 8 ? '¡Se arma el corro! ' : n >= 5 ? 'Buen concurso. ' : 'Hoy no es tu día. ') + (p.din ? '+' + k1(p.din) + ' mil €. ' : '') + 'Calle +' + p.calle;
    });
    return { ok: true, texto: 'Empieza el concurso' };
  }
  function libres(st, ctx) {
    if (!act(st) || !PJ()) return { ok: false, motivo: 'No disponible.' };
    const c = C(st),
      d = datos(st),
      v = PJ().ventana('Tiros libres');
    PJ().ronda(st, v, 'Tiros libres', 10, 'tl', 0.75, 'La zona es más ancha que en el triple. Concéntrate.', n => {
      c.moral = clamp(c.moral + (n >= 7 ? 2 : 0.5), 0, 100);
      d.calle = clamp(d.calle + n * 0.15, 0, 100);
      d.rec.libres = Math.max(d.rec.libres, n);
      completa(st, e => e.tipo === 'libres' && n >= e.n);
      v.marcador.innerHTML = '<span>Resultado</span><b>' + n + ' de 10</b>';
      v.msg.textContent = n >= 8 ? '¡Una máquina desde la línea!' : 'Seguimos practicando.';
    });
    return { ok: true, texto: 'A la línea de tiros libres' };
  }
  // Uno contra uno callejero: el rival depende de tu «calle» y de tu fama; primero a 5
  async function uno(st, ctx) {
    if (!act(st) || !PJ()) return { ok: false, motivo: 'No disponible.' };
    const c = C(st),
      d = datos(st),
      p = st.jugadores.yo,
      v = PJ().ventana('Uno contra uno callejero');
    const rival = 50 + Math.round(d.calle / 6) + Math.round(c.fama / 10) + (ctx && ctx.nivel ? ctx.nivel : 0) + Math.round(Math.random() * 6),
      yo = (p ? p.ovr : 60) + (PJ().forma(st) - 0.8) * 20;
    let a = 0,
      b = 0,
      vivo = true;
    v.alCerrar(() => {
      vivo = false;
    });
    v.msg.textContent = 'Primero a 5. Atacas tú: acierta con el cursor para anotar; defiendes con tu media. Tu rival tiene nivel ' + rival + '.';
    while (vivo && a < 5 && b < 5) {
      v.marcador.innerHTML = '<span>Tú ' + a + '</span><b>' + b + ' Rival</b>';
      const ok = await PJ().cursor(v.zona, Math.max(0.12, Math.min(0.46, 0.1 + (PJ().att(st, 'tiro2') - 40) / 160 - (rival - 60) / 400)), 1.0 + (a + b) * 0.06, 'Atacar');
      if (!vivo) return;
      if (ok || Math.random() < 0.12) {
        a++;
        v.msg.textContent = '¡Canasta tuya!';
      } else v.msg.textContent = 'Tiro fallado.';
      await new Promise(r => setTimeout(r, 450));
      if (!vivo || a >= 5) break;
      if (Math.random() < 0.34 + (rival - yo) / 160) {
        b++;
        v.msg.textContent = 'Anota el rival.';
      } else v.msg.textContent = '¡Buena defensa!';
      await new Promise(r => setTimeout(r, 450));
    }
    if (!vivo) return { ok: true };
    const gana = a > b;
    v.marcador.innerHTML = '<span>Final</span><b>' + a + ' - ' + b + '</b>';
    c.moral = clamp(c.moral + (gana ? 4 : 1), 0, 100);
    d.calle = clamp(d.calle + (gana ? 4 : 1), 0, 100);
    if (p && p.estado) p.estado.fatiga = Math.min(100, (p.estado.fatiga || 0) + 2);
    if (gana) {
      d.rec.uno++;
      const din = Math.round((0.3 + d.calle / 100) * 10) / 10;
      GM.mods.hogar.ingresar(st, din);
      if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Uno contra uno callejero', din);
      c.fama += 0.2;
      completa(st, e => e.tipo === 'uno');
    }
    v.msg.textContent = gana ? '¡Les has ganado! Se corre la voz por el barrio.' : 'Esta vez gana el rival. Vuelve cuando quieras.';
    return { ok: true };
  }
  // Entreno de precisión: 12 tiros con una zona que se estrecha; cada acierto vale más que el anterior si encadenas
  function precision(st, ctx) {
    if (!act(st) || !PJ()) return { ok: false, motivo: 'No disponible.' };
    const c = C(st),
      d = datos(st),
      p = st.jugadores.yo,
      v = PJ().ventana('Entreno de precisión');
    let vivo = true;
    v.alCerrar(() => {
      vivo = false;
    });
    (async () => {
      let pts = 0,
        racha = 0;
      const A = PJ().att(st, 'tiro2'),
        base = Math.max(0.12, Math.min(0.46, 0.1 + ((A - 40) / 150) * PJ().forma(st)));
      v.msg.textContent = 'La zona se estrecha cada tiro. Encadena aciertos para sumar más.';
      for (let i = 1; i <= 12 && vivo; i++) {
        v.marcador.innerHTML = '<span>Tiro ' + i + ' de 12</span><b>' + pts + ' puntos</b>';
        const ok = await PJ().cursor(v.zona, Math.max(0.07, base * (1 - i * 0.04)), 0.9 + i * 0.06, 'Tirar');
        if (!vivo) return;
        if (ok) {
          racha++;
          pts += racha >= 3 ? 2 : 1;
          v.msg.textContent = racha >= 3 ? '¡Racha de ' + racha + '!' : '¡Dentro!';
        } else {
          racha = 0;
          v.msg.textContent = 'Fallado.';
        }
        await new Promise(r => setTimeout(r, 380));
      }
      if (!vivo) return;
      const xp = Math.round(pts * 0.0025 * 1000) / 1000;
      if (p) {
        p.xp = (p.xp || 0) + xp;
        if (p.estado) p.estado.fatiga = Math.min(100, (p.estado.fatiga || 0) + 2);
      }
      c.moral = clamp(c.moral + (pts >= 10 ? 3 : 1), 0, 100);
      d.calle = clamp(d.calle + 0.5, 0, 100);
      d.rec.precision = Math.max(d.rec.precision, pts);
      completa(st, e => e.tipo === 'precision' && pts >= e.n);
      v.marcador.innerHTML = '<span>Resultado</span><b>' + pts + ' puntos</b>';
      v.msg.textContent =
        (pts >= 14 ? 'Entreno de nivel profesional. ' : pts >= 8 ? 'Buen entreno. ' : 'Hay que seguir. ') + 'Progresión +' + xp.toFixed(3).replace('.', ',') + '.';
    })();
    return { ok: true, texto: 'Empieza el entreno' };
  }
  // ---------- All-Star jugable ----------
  function jugarAllStar(st, liga, tipo) {
    const A = GM.mods.allstar;
    if (!act(st) || !A || !PJ()) return { ok: false, motivo: 'No disponible.' };
    const inv = A.estado(st).inv[liga];
    if (!inv || inv[tipo] !== 'aceptada') return { ok: false, motivo: 'No has aceptado esa invitación.' };
    if (inv.jugado && inv.jugado[tipo]) return { ok: false, motivo: 'Ya lo has jugado.' };
    const v = PJ().ventana(tipo === 'triples' ? 'All-Star: concurso de triples' : 'All-Star: concurso de mates'),
      res = [];
    let vivo = true;
    v.alCerrar(() => {
      vivo = false;
    });
    (async () => {
      const A0 = PJ().att(st, tipo === 'triples' ? 'tiro3' : 'fisico'),
        zona = Math.max(0.1, Math.min(0.44, 0.1 + ((A0 - 40) / 150) * PJ().forma(st))),
        rondas = tipo === 'triples' ? 3 : 2,
        tiros = tipo === 'triples' ? 5 : 1;
      for (let r = 1; r <= rondas && vivo; r++) {
        let h = 0;
        for (let t = 1; t <= tiros && vivo; t++) {
          v.marcador.innerHTML =
            '<span>Ronda ' +
            r +
            ' de ' +
            rondas +
            (tipo === 'triples' ? ', tiro ' + t + ' de ' + tiros : '') +
            '</span><b>' +
            (res.length ? 'Antes: ' + res.join(', ') : 'Primera ronda') +
            '</b>';
          v.msg.textContent = tipo === 'triples' ? 'Cinco tiros por ronda: cada acierto suma.' : 'Un mate por ronda: afina el cursor para la nota del jurado.';
          const ok = await PJ().cursor(v.zona, tipo === 'triples' ? zona : zona * 0.8, 1.0 + r * 0.12 + t * 0.03, tipo === 'triples' ? 'Tirar' : 'Mate');
          if (!vivo) return;
          if (ok) h++;
          v.msg.textContent = ok ? '¡Dentro!' : 'Fallado.';
          await new Promise(q => setTimeout(q, 380));
        }
        res.push(tipo === 'triples' ? Math.round(6 + h * 2.6) : Math.round(36 + (h ? 10 : 0) + Math.random() * 4));
      }
      if (!vivo) return;
      A.registrarJugado(st, liga, tipo, res);
      v.marcador.innerHTML = '<span>Tus rondas</span><b>' + res.join(', ') + '</b>';
      v.msg.textContent = 'Listo: el resultado cuenta el día del concurso.';
      if (GM.ui && GM.ui.refrescar) GM.ui.refrescar();
    })();
    return { ok: true, texto: 'Empieza el concurso' };
  }
  // ---------- Canchas en la ciudad ----------
  function pista(S, M, st, x, z, nombre, nivel, k) {
    const g = new T.Group(),
      asf = new T.MeshStandardMaterial({ color: 0x4d5560, roughness: 0.95 }),
      azul = new T.MeshStandardMaterial({ color: 0x2f6aa8, roughness: 0.9 }),
      blanco = new T.MeshBasicMaterial({ color: 0xf2f2f2 }),
      met = new T.MeshStandardMaterial({ color: 0x3a3f44, metalness: 0.4, roughness: 0.6 }),
      tab = new T.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5 }),
      aro = new T.MeshStandardMaterial({ color: 0xe8590c });
    const base = new T.Mesh(new T.PlaneGeometry(15, 9).rotateX(-Math.PI / 2), asf);
    base.position.set(0, 0.045, 0);
    g.add(base);
    const pintura = new T.Mesh(new T.PlaneGeometry(13.6, 7.6).rotateX(-Math.PI / 2), azul);
    pintura.position.set(0, 0.05, 0);
    g.add(pintura);
    const linea = (w, d, px, pz) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), blanco);
      m.position.set(px, 0.055, pz);
      g.add(m);
    };
    linea(13.6, 0.08, 0, 3.8);
    linea(13.6, 0.08, 0, -3.8);
    linea(0.08, 7.6, 6.8, 0);
    linea(0.08, 7.6, -6.8, 0);
    linea(0.08, 7.6, 0, 0);
    const c = new T.Mesh(new T.RingGeometry(1.1, 1.18, 28).rotateX(-Math.PI / 2), blanco);
    c.position.set(0, 0.056, 0);
    g.add(c);
    for (const s of [-1, 1]) {
      const px = s * 6.5,
        poste = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 3.1, 8), met);
      poste.position.set(px + s * 0.5, 1.55, 0);
      poste.castShadow = true;
      g.add(poste);
      const brazo = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 0.06), met);
      brazo.position.set(px + s * 0.25, 3.05, 0);
      g.add(brazo);
      const tablero = new T.Mesh(new T.BoxGeometry(0.06, 1.0, 1.7), tab);
      tablero.position.set(px, 3.2, 0);
      tablero.castShadow = true;
      g.add(tablero);
      const ar = new T.Mesh(new T.TorusGeometry(0.23, 0.02, 6, 16).rotateX(Math.PI / 2), aro);
      ar.position.set(px - s * 0.28, 2.95, 0);
      g.add(ar);
    }
    g.position.set(x, 0, z);
    S.mundo.add(g);
    const G = S.G;
    if (G && G.bloquea) for (const s of [-1, 1]) G.bloquea(x + s * 7 - 0.4, z - 0.4, x + s * 7 + 0.4, z + 0.4);
    const sala = { id: 'cancha_' + k, nombre: nombre, accion: '', destino: {}, acciones: s2 => acciones(s2, { nombre, nivel }) },
      club = st.equipos[st.clubId];
    const zn = M.zona(S.mundo, sala, x, z + 3.2, club);
    S.zonas.push(zn);
    return zn;
  }
  function canchas(S, M, st) {
    if (!act(st) || !S.G || !S.paseoBase) return;
    S.canchas = [];
    let holgura = 15;
    const calle = (x, z) => {
      const cc = GM.movilidad && GM.movilidad.calleCercana ? GM.movilidad.calleCercana(S, x, z) : null;
      return cc ? cc.d : 99;
    };
    const libre = (x, z) => {
      for (let i = -8; i <= 8; i += 0.75)
        for (let j = -5; j <= 5; j += 0.75) {
          const [a, b] = S.G.celda(x + i, z + j);
          if (!S.G.libre(a, b)) return false;
        }
      if (
        [
          [0, 0],
          [-8, -5],
          [8, -5],
          [-8, 5],
          [8, 5]
        ].some(([i, j]) => calle(x + i, z + j) < holgura)
      )
        return false;
      return !(S.zonas || []).some(q => Math.hypot(q.obj.position.x - x, q.obj.position.z - z) < 10);
    };
    const cand = (S.paseoBase || []).filter(q => {
        const dd = Math.hypot(q[0], q[1]);
        return dd > 60 && dd < (S.RW || 300) - 50;
      }),
      usados = [];
    const grid = [];
    for (let rad = 70; rad < (S.RW || 300) - 40; rad += 22)
      for (let k = 0; k < 18; k++) grid.push([Math.cos((k / 18) * Math.PI * 2) * rad, Math.sin((k / 18) * Math.PI * 2) * rad]);
    const nombres = ['Cancha del parque', 'Cancha del barrio', 'Pista de la plaza'],
      niv = [0, 4, 8];
    for (const pasada of [15, 9, 4]) {
      holgura = pasada;
      for (const q of cand.concat(grid)) {
        if (usados.length >= 2) break;
        if (usados.some(u => Math.hypot(u[0] - q[0], u[1] - q[1]) < 110)) continue;
        if (!libre(q[0], q[1])) continue;
        usados.push(q);
        const k = usados.length - 1;
        S.canchas.push(pista(S, M, st, q[0], q[1], nombres[(U.hash(st.clubId) + k) % 3] + (k ? ' norte' : ''), niv[k], k));
      }
      if (usados.length >= 2) break;
    }
  }
  // Gente en las canchas: dos jugadores que corren, un rival que te espera y público en los bordes (más el sábado y el domingo)
  const MOD = ['h-casual_hoodie', 'h-casual_2', 'h-beach', 'm-casual', 'm-punk'],
    PIELES = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'];
  async function gente(S, M, st) {
    if (!act(st) || !S.canchas || !S.canchas.length || !S.gente) return;
    S.jugadoresCancha = [];
    const finde = [0, 6].indexOf(U.weekday(st.fecha)) >= 0,
      noche = (S.hora || 12) > 21 || (S.hora || 12) < 7,
      club = st.equipos[st.clubId];
    for (let k = 0; k < S.canchas.length; k++) {
      const zn = S.canchas[k],
        cx = zn.obj.position.x,
        cz = zn.obj.position.z - 3.2,
        h = U.hash(st.fecha + 'cancha' + k) >>> 0;
      if (noche && h % 3) continue;
      const nuevo = async (o, rol, x, z, ry) => {
        const p = await M.personaje(Object.assign({ modelo: MOD[(h + rol.length) % 5], altura: 170 + (h % 25), piel: PIELES[(h >>> 3) % 5] }, o));
        p.fijo = true;
        p.rol = rol;
        p.obj.position.set(x, 0, z);
        p.obj.rotation.y = ry || 0;
        p.obj.userData = { npc: S.gente.length };
        M.anim(p, 'idle');
        S.mundo.add(p.obj);
        S.gente.push(p);
        return p;
      };
      for (let i = 0; i < 2; i++) {
        const p = await nuevo(
          { modelo: MOD[(h + i * 2) % 5], ropa: [['#c0392b', '#1d4f91'][i], '#222'] },
          i ? 'Chaval jugando un tres contra tres' : 'Chaval jugando un tres contra tres',
          cx + (i ? 2 : -2),
          cz + i,
          i ? Math.PI : 0
        );
        p.pista = { cx, cz, fase: i * Math.PI, vel: 0.5 + (h % 5) / 10 };
        M.anim(p, 'walk');
        S.jugadoresCancha.push(p);
      }
      const riv = await nuevo(
        { modelo: MOD[(h + 3) % 5], altura: 188 + (h % 14), ropa: [club.colores[1] || '#ffffff', '#222'] },
        'Rival del barrio, espera su turno',
        cx + 5.2,
        cz + 3.2,
        -Math.PI / 2
      );
      riv.rival = true;
      M.anim(riv, 'idle');
      const publico = finde ? 4 : 2;
      for (let i = 0; i < publico; i++) {
        const p = await nuevo({ modelo: MOD[(h + i + 1) % 5] }, i % 2 ? 'Vecino mirando el partido' : 'Chaval esperando pista', cx - 5 + i * 3.1, cz + 4.9, Math.PI);
        if (i % 2) M.anim(p, 'emote-yes');
      }
    }
  }
  function moverCanchas(S, M, dt) {
    if (!S.jugadoresCancha) return;
    const t = performance.now() / 1000;
    S.jugadoresCancha.forEach(p => {
      const q = p.pista,
        a = t * q.vel + q.fase,
        x = q.cx + Math.sin(a) * 4.6,
        z = q.cz + Math.cos(a * 1.3) * 2.6,
        dx = x - p.obj.position.x,
        dz = z - p.obj.position.z;
      if (Math.hypot(dx, dz) > 0.001) p.obj.rotation.y = Math.atan2(dx, dz);
      p.obj.position.x = x;
      p.obj.position.z = z;
    });
  }
  // Anillos dorados sobre los sitios con encargo pendiente y marca en el mapa (sala.encargo)
  function marcas(S, M, st) {
    if (!act(st)) return;
    generar(st, S);
    const pend = lista(st).filter(e => !e.hecho),
      ids = new Set();
    pend.forEach(e => {
      if (e.destino === 'cancha')
        (S.zonas || []).forEach(z => {
          if (/^cancha_/.test(z.sala.id)) ids.add(z.sala.id);
        });
      else ids.add(e.destino);
    });
    const aros = [];
    (S.zonas || []).forEach(z => {
      z.sala.encargo = ids.has(z.sala.id);
      if (!z.sala.encargo) return;
      const m = new T.Mesh(
        new T.RingGeometry(0.8, 1.0, 28).rotateX(-Math.PI / 2),
        new T.MeshBasicMaterial({ color: 0xffc83a, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })
      );
      m.position.set(z.obj.position.x, 0.08, z.obj.position.z);
      m.renderOrder = 6;
      m.userData.marca = true;
      S.mundo.add(m);
      aros.push(m);
    });
    (S.puebloAnim = S.puebloAnim || []).push(t => {
      aros.forEach(m => {
        m.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
      });
    });
  }
  function acciones(st, ctx) {
    const d = datos(st),
      out = [
        { ico: 'balon', id: 'triples', t: 'Concurso de triples', d: '10 tiros con el cursor. Premio según los que metas.', disponible: true, fn: () => triples(st, ctx) },
        { ico: 'balon', id: 'libres', t: 'Tiros libres', d: '10 tiros más fáciles. Sube el ánimo.', disponible: true, fn: () => libres(st, ctx) },
        {
          ico: 'balon',
          id: 'uno',
          t: 'Uno contra uno callejero',
          d: 'Primero a 5. Tu calle: ' + Math.round(d.calle) + ' de 100. Récord de victorias: ' + d.rec.uno + '.',
          disponible: true,
          fn: () => uno(st, ctx)
        },
        {
          ico: 'balon',
          id: 'precision',
          t: 'Entreno de precisión',
          d: '12 tiros con la zona cada vez más estrecha. Da progresión. Récord: ' + d.rec.precision + ' puntos.',
          disponible: true,
          fn: () => precision(st, ctx)
        },
        {
          ico: 'estrella',
          id: 'encargos',
          t: 'Encargos de la ciudad (' + pendientes(st) + ')',
          d: 'Recados con premio por los sitios de la ciudad.',
          disponible: true,
          fn: () => {
            panelEncargos();
            return { ok: true, texto: 'Encargos' };
          }
        }
      ];
    return out;
  }
  function panelEncargos() {
    const st = GM.state;
    if (!act(st)) return;
    const S = GM.sede.activa() && GM.sede._estado();
    generar(st, S && S.escena === 'calle' ? S : null);
    const h = GM.h,
      L = lista(st),
      cuerpo = h(
        'div',
        { class: 'pb' },
        h(
          'div',
          { class: 'pb-hero' },
          h('div', null, h('h3', null, 'Encargos de la ciudad'), h('p', null, 'Recados por los sitios de tu ciudad. Calle: ' + Math.round(datos(st).calle) + ' de 100.'))
        ),
        L.length
          ? L.map(e => {
              const dias = Math.max(0, U.diffDays(st.fecha, e.hasta));
              return h(
                'div',
                { class: 'pb-acc', style: { cursor: 'default', opacity: e.hecho ? 0.55 : 1 } },
                h(
                  'div',
                  null,
                  h('b', null, e.texto),
                  h(
                    'span',
                    null,
                    (e.hecho ? 'Cumplido' : e.diario ? 'Hoy' : 'Quedan ' + dias + ' días') +
                      ', premio ' +
                      k1(e.premio.dinero) +
                      ' mil €, fama +' +
                      e.premio.fama +
                      ', calle +' +
                      e.premio.calle +
                      (e.destino && e.destino !== 'cancha' && SITIOS[e.destino] ? '. Sitio: ' + SITIOS[e.destino] : '. En cualquier cancha de la ciudad')
                  )
                )
              );
            })
          : h('p', null, 'Hoy no hay encargos.')
      );
    GM.ui.modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function selfTest() {
    const st = { modo: 'carrera', fecha: '2026-10-01', carrera: { fama: 30, moral: 50, dinero: 10, cjuego: null }, equipos: {}, noticias: [], jugadores: { yo: {} } };
    generar(st, null);
    return lista(st).length === 4 && lista(st).filter(e => e.diario).length === 1 && Object.keys(SITIOS).length >= 12;
  }
  GM.ciudadJuego = {
    SITIOS,
    datos,
    encargos: lista,
    generar,
    canchas,
    gente,
    moverCanchas,
    marcas,
    panelEncargos,
    pendientes,
    acciones,
    triples,
    libres,
    uno,
    precision,
    jugarAllStar,
    selfTest
  };
  GM.register && GM.register('ciudadJuego', GM.ciudadJuego);
})();
