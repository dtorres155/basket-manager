/* Tiro a canasta de los jugadores en la pista de la sede: empieza, anima brazos y balón y termina.
   Se separó de sede3d.js: GM.sedeTiro({ S: () => escena activa, U, rnd, brazos, balonMat, _a, manos }) devuelve { actualizarTiro, empezarTiro, acabarTiro }. */
(function () {
  GM.sedeTiro = function (ctx) {
    const { U, rnd, brazos, balonMat, _a, _b, manos } = ctx;
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
    function actualizarTiro(n, dt) {
      const T = n.tiro,
        b = T.balon,
        f = n.obj.rotation.y,
        delante = _b.set(Math.sin(f), 0, Math.cos(f)),
        h = (n.altura || 190) / 100;
      T.t += dt;
      let w = 0;
      if (T.fase === 'manos') {
        manos(n, b.position);
        b.position.y += Math.sin(T.t * 9) * 0.03;
        if (T.t > 0.8 + T.r() * 0.02) {
          T.fase = 'prepara';
          T.t = 0;
        }
      } else if (T.fase === 'prepara') {
        // flexión y subida de brazos
        w = Math.min(1, T.t / 0.45);
        n.obj.position.y = -0.08 * Math.sin(Math.min(1, T.t / 0.45) * Math.PI);
        manos(n, _a);
        b.position.lerpVectors(
          _a,
          _a
            .clone()
            .setY(h + 0.42)
            .addScaledVector(delante, 0.12),
          w
        );
        if (T.t >= 0.45) {
          // suelta: parábola hacia el aro (o hacia el hierro si falla)
          T.fase = 'vuelo';
          T.t = 0;
          T.ini = b.position.clone();
          const mete = T.r() < T.acierto;
          T.mete = mete;
          T.fin = T.red.aro.clone();
          if (!mete) T.fin.add(new THREE.Vector3((T.r() - 0.5) * 0.5, 0.05, (T.r() - 0.5) * 0.5));
          const d = Math.hypot(T.fin.x - T.ini.x, T.fin.z - T.ini.z);
          T.dur = 0.75 + d * 0.06;
          T.arco = 1.0 + d * 0.13;
        }
      } else if (T.fase === 'vuelo') {
        w = Math.max(0, 1 - T.t / 0.55);
        n.obj.position.y = 0.16 * Math.max(0, Math.sin(Math.min(1, T.t / 0.4) * Math.PI));
        const u = Math.min(1, T.t / T.dur);
        b.position.lerpVectors(T.ini, T.fin, u);
        b.position.y += T.arco * 4 * u * (1 - u);
        b.rotation.x -= dt * 12;
        if (u >= 1) {
          T.fase = 'suelto';
          T.t = 0;
          if (T.mete) {
            T.vel.set(0, -1.2, 0);
            T.red.t = 0;
          } // por dentro del aro, la red se mueve
          else {
            const fuera = new THREE.Vector3(b.position.x - T.red.aro.x, 0, b.position.z - T.red.aro.z);
            if (fuera.lengthSq() < 0.001) fuera.set(T.r() - 0.5, 0, T.r() - 0.5);
            fuera.normalize();
            T.vel.set(fuera.x * 2.4, 1.8 + T.r(), fuera.z * 2.4);
          }
        }
      } else if (T.fase === 'suelto') {
        // gravedad, botes y rebote hacia el tirador
        T.vel.y -= 9.8 * dt;
        b.position.addScaledVector(T.vel, dt);
        b.rotation.x -= dt * 8;
        if (b.position.y < 0.12) {
          b.position.y = 0.12;
          T.vel.y = Math.abs(T.vel.y) * 0.62;
          manos(n, _a);
          const hacia = _a.sub(b.position).setY(0);
          if (hacia.length() > 0.1) {
            hacia.normalize();
            T.vel.x = T.vel.x * 0.4 + hacia.x * 2.2;
            T.vel.z = T.vel.z * 0.4 + hacia.z * 2.2;
          }
        }
        if (T.t > 1.6) {
          T.fase = 'vuelve';
          T.t = 0;
          T.ini = b.position.clone();
        }
      } else if (T.fase === 'vuelve') {
        const u = Math.min(1, T.t / 0.7);
        manos(n, _a);
        b.position.lerpVectors(T.ini, _a, u);
        b.position.y += 0.5 * Math.sin(u * Math.PI);
        if (u >= 1) {
          T.fase = 'manos';
          T.t = 0;
        }
      }
      if (w > 0) brazos(n, w, delante);
    }
    function empezarTiro(n) {
      const pos = n.obj.position;
      let red = null,
        d = 1e9;
      S.redes.forEach(r => {
        const dd = Math.hypot(r.aro.x - pos.x, r.aro.z - pos.z);
        if (dd < d) {
          d = dd;
          red = r;
        }
      });
      if (!red) return;
      const balon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), balonMat());
      balon.castShadow = true;
      S.mundo.add(balon);
      n.obj.rotation.y = Math.atan2(red.aro.x - pos.x, red.aro.z - pos.z);
      const j = S.st.jugadores[n.jugador],
        tiro = j && j.att ? (d > 6.6 ? j.att.tiro3 : j.att.tiro2) : 60;
      n.tiro = { red, balon, fase: 'manos', t: 0, acierto: Math.min(0.85, 0.2 + (tiro - 40) / 80), vel: new THREE.Vector3(), r: rnd(U.hash(n.jugador + S.st.fecha + 'tiro')) };
    }
    function acabarTiro(n) {
      if (!n.tiro) return;
      S.mundo.remove(n.tiro.balon);
      n.tiro.balon.geometry.dispose();
      n.tiro = null;
      n.obj.position.y = 0;
    }
    return { actualizarTiro, empezarTiro, acabarTiro };
  };
})();
