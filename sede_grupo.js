/* Actividades de grupo de la sede (rueda de jugadores, tiros y charlas con el entrenador).
   Se separó de sede3d.js: GM.sedeGrupo({ S: () => escena activa, anim, CENTRO, crearGrupo, peto, disolver, entrenadorDice, manosDe, mirar, lanzar, irDirecto }) devuelve { actualizarGrupo }. */
(function () {
  GM.sedeGrupo = function (ctx) {
    const { ARO, anim, CENTRO, crearGrupo, peto, disolver, entrenadorDice, manosDe, mirar, lanzar, irDirecto } = ctx;
    const S = new Proxy(
      {},
      {
        get: (_, k) => ctx.S()[k],
        set: (_, k, v) => {
          ctx.S()[k] = v;
          return true;
        }
      }
    ); // la escena activa cambia al abrir otra: se lee en cada acceso
    function actualizarGrupo(dt) {
      if (S.entrenador && S.entrenador.tGesto !== undefined && (S.entrenador.tGesto -= dt) <= 0) {
        S.entrenador.tGesto = undefined;
        anim(S.entrenador, 'idle');
      }
      if (!S.grupo) {
        S.tGrupo = (S.tGrupo === undefined ? 6 : S.tGrupo) - dt;
        if (S.tGrupo <= 0) {
          S.tGrupo = 30;
          crearGrupo();
        }
        return;
      }
      const G = S.grupo,
        b = G.balon;
      G.t += dt;
      if (G.fase === 'reclutar') {
        if (G.miembros.length && G.miembros.every(n => n.listo)) {
          G.fase = 'juego';
          G.t = 0;
          G.poseedor = G.miembros[0];
          if (G.tipo === 'partidillo') {
            G.miembros.slice(3).forEach(n => peto(n, true));
            entrenadorDice('Los de naranja, con peto. ¡A jugar!');
          }
        } else if (G.t > 25) disolver();
        return;
      }
      if (G.t > G.dura) return disolver();
      // Balón en vuelo (pase o tiro)
      if (G.vuelo) {
        const V = G.vuelo;
        V.t += dt;
        const u = Math.min(1, V.t / V.dur);
        b.position.lerpVectors(V.ini, V.fin, u);
        b.position.y += V.arco * 4 * u * (1 - u);
        b.rotation.x -= dt * 10;
        if (u >= 1) {
          G.vuelo = null;
          V.alFin();
        }
      } else if (G.poseedor) {
        const p = G.poseedor;
        manosDe(p, b.position);
        if (G.tipo === 'partidillo') {
          const f = p.obj.rotation.y;
          b.position.x += Math.cos(f) * 0.25;
          b.position.z -= Math.sin(f) * 0.25;
          b.position.y = 0.12 + Math.abs(Math.sin(G.t * 7)) * 0.75;
        }
      }
      if (G.tipo === 'rueda') {
        G.miembros.forEach(n => {
          if (n !== G.poseedor || !G.vuelo) mirar(n, CENTRO.x, CENTRO.z, dt);
          n.grupoBrazos = Math.max(0, (n.grupoBrazos || 0) - dt * 3);
        });
        if (!G.vuelo && G.poseedor && (G.tDec -= dt) <= 0) {
          const p = G.poseedor,
            otros = G.miembros.filter(m => m !== p),
            q = otros[(G.r() * otros.length) | 0];
          G.tDec = 0.7 + G.r() * 0.5;
          p.obj.rotation.y = Math.atan2(q.obj.position.x - p.obj.position.x, q.obj.position.z - p.obj.position.z);
          p.grupoBrazos = 0.6;
          G.poseedor = null;
          lanzar(G, b.position, manosDe(q, new THREE.Vector3()), 0.45, 0.3, () => {
            G.poseedor = q;
            G.pases++;
            if (G.pases % 12 === 0) entrenadorDice(['¡Más rápido!', '¡Pase y corte!', 'Mirad antes de recibir'][((G.pases / 12) % 3) | 0]);
          });
        }
        return;
      }
      // 3 contra 3: equipo 0 = miembros 0-2, equipo 1 = 3-5
      const ataque = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) === G.posesion),
        defensa = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) !== G.posesion);
      ataque.forEach((n, k) => {
        if (!n.dest || (n.tDest -= dt) <= 0) {
          const a = [-0.95, 0, 0.95][k] + (G.r() - 0.5) * 0.6,
            rr = 2.6 + G.r() * 4.2;
          n.dest = [ARO.x + Math.cos(a) * rr, ARO.z + Math.sin(a) * rr * 1.2];
          n.dest[0] = Math.max(-17.4, Math.min(-10.2, n.dest[0]));
          n.dest[1] = Math.max(-11, Math.min(-1.2, n.dest[1]));
          n.tDest = 1.4 + G.r() * 1.8;
        }
        if (!irDirecto(n, n.dest[0], n.dest[1], dt)) mirar(n, ARO.x, ARO.z, dt);
        n.grupoBrazos = Math.max(0, (n.grupoBrazos || 0) - dt * 2.5);
      });
      defensa.forEach((n, k) => {
        const o = ataque[k] || ataque[0],
          hx = ARO.x - o.obj.position.x,
          hz = ARO.z - o.obj.position.z,
          l = Math.hypot(hx, hz) || 1;
        if (!irDirecto(n, o.obj.position.x + (hx / l) * 0.95, o.obj.position.z + (hz / l) * 0.95, dt)) mirar(n, o.obj.position.x, o.obj.position.z, dt);
        n.grupoBrazos = 0.25;
      });
      if (G.vuelo || !G.poseedor) return;
      if ((G.tDec -= dt) > 0) return;
      G.tDec = 1.3 + G.r() * 1.2;
      const p = G.poseedor;
      if (G.pases >= 2 && G.r() < 0.5) {
        // tiro
        const j = S.st.jugadores[p.jugador],
          d = Math.hypot(ARO.x - p.obj.position.x, ARO.z - p.obj.position.z),
          tiro = j && j.att ? (d > 6.6 ? j.att.tiro3 : j.att.tiro2) : 60,
          mete = G.r() < Math.min(0.75, 0.15 + (tiro - 40) / 85);
        p.obj.rotation.y = Math.atan2(ARO.x - p.obj.position.x, ARO.z - p.obj.position.z);
        p.grupoBrazos = 1;
        G.poseedor = null;
        G.pases = 0;
        const fin = ARO.clone();
        if (!mete) fin.add(new THREE.Vector3((G.r() - 0.5) * 0.5, 0.05, (G.r() - 0.5) * 0.5));
        const ini = manosDe(p, new THREE.Vector3()).setY((p.altura || 195) / 100 + 0.4);
        lanzar(G, ini, fin, 0.8 + d * 0.05, 1 + d * 0.12, () => {
          const red = S.redes.find(r => r.aro.distanceTo(ARO) < 0.5);
          if (mete && red) red.t = 0;
          const sigue = mete ? 1 - G.posesion : G.r() < 0.55 ? 1 - G.posesion : G.posesion; // rebote
          G.posesion = sigue;
          const nuevo = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) === sigue)[0];
          if (mete && G.r() < 0.5) entrenadorDice(['¡Buena canasta!', '¡Eso es, buen tiro!', 'Así se juega'][(G.r() * 3) | 0]);
          else if (!mete && G.r() < 0.4) entrenadorDice(['¡Rebote, rebote!', '¡Cerrad el rebote!', '¡Atrás, defensa!'][(G.r() * 3) | 0]);
          lanzar(G, b.position.clone(), manosDe(nuevo, new THREE.Vector3()), 0.7, 0.6, () => {
            G.poseedor = nuevo;
          });
        });
      } else {
        // pase a un compañero
        const q = ataque.filter(m => m !== p)[(G.r() * 2) | 0] || ataque[0];
        if (q === p) return;
        p.obj.rotation.y = Math.atan2(q.obj.position.x - p.obj.position.x, q.obj.position.z - p.obj.position.z);
        p.grupoBrazos = 0.5;
        G.poseedor = null;
        lanzar(G, b.position.clone().setY(1.1), manosDe(q, new THREE.Vector3()), 0.42, 0.25, () => {
          G.poseedor = q;
          G.pases++;
        });
      }
    }
    return { actualizarGrupo };
  };
})();
