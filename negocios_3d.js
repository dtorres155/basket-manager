/* INTERIOR DE TUS NEGOCIOS (punto 55, GM.negociosMundo) — la escena 'interior:negocio' de interiores.js. Se entra desde el portal de tu negocio en la ciudad real (calle_real.js) y se ve lo que
   dicen los números: el mostrador, el equipo propio de cada tipo (barra y taburetes del bar, mesas del restaurante, estanterías de la tienda, máquinas del gimnasio, pista de la escuela, pupitres de la
   academia, recepción del hotel, camillas de la clínica), tu plantilla con su nombre y su ánimo trabajando, y tantos clientes como los de hoy. Desde dentro puedes echar una mano, charlar con la plantilla
   o ver la caja. Expone: negocio(st), construir(ctx), poblar(S, M, st, nueva), acciones(st), TIPO_ES. */
(function () {
  const U = GM.util,
    clamp = U.clamp;
  const negocio = st => {
    const E = GM.negocios && st.negocios;
    if (!E) return null;
    const id = st.sede && st.sede.negocioId;
    return E.lista.find(n => n.id === id && !n.cerrado) || E.lista.find(n => !n.cerrado) || null;
  };
  const OFICIO = {
    bar: 'camarero',
    restaurante: 'camarero',
    tienda: 'dependiente',
    gimnasio: 'monitor',
    escuela: 'entrenador',
    academia: 'profesor',
    hotel: 'recepción',
    clinica: 'fisioterapeuta'
  };
  function construir(c) {
    const { W, G, S, st, x0, x1, z0, z1, w, d } = c,
      n = negocio(st),
      tipo = n ? n.tipo : 'bar',
      mat = c.mat,
      caja = c.caja,
      cil = c.cil,
      luz = c.luz;
    // mostrador al fondo con la caja
    caja(W, 5.2, 1.05, 0.8, '#5a3b26', x1 - 3.4, 0, z0 + 1.6);
    caja(W, 5.4, 0.07, 1.0, '#2a2018', x1 - 3.4, 1.05, z0 + 1.6);
    caja(W, 0.5, 0.35, 0.4, '#222a30', x1 - 1.6, 1.12, z0 + 1.6);
    G.bloquea(x1 - 6.2, z0 + 1.1, x1 - 0.6, z0 + 2.1);
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.7), mat('#1d2630'));
    cartel.position.set(0, 1.6, z0 + 0.16);
    W.add(cartel);
    S.mesasInt = [];
    S.taburetes = [];
    S.mueblesPend = [];
    S.puntosInt = [
      [-3, 1],
      [3, 2.5],
      [0, 3.2],
      [-4.5, 3]
    ];
    S.zonaNegocio = [0, z1 - 2.6];
    if (tipo === 'bar' || tipo === 'restaurante') {
      S.mesasInt =
        tipo === 'bar'
          ? [
              [-4.5, 0.6],
              [-1.6, 1.8],
              [2, 1.8]
            ]
          : [
              [-4.8, -0.6],
              [-1.6, -0.6],
              [1.6, 1.4],
              [-4.8, 2.6],
              [-1.6, 2.6]
            ];
      S.mueblesPend = []
        .concat(
          ...S.mesasInt.map(([x, z]) => [
            [tipo === 'bar' ? 'tableCross' : 'tableRound', x, z, 0],
            ['chair', x - 0.9, z, 90],
            ['chair', x + 0.9, z, -90]
          ])
        )
        .concat([
          ['stoolBar', x1 - 5.2, z0 + 2.6, 0],
          ['stoolBar', x1 - 3.8, z0 + 2.6, 0],
          ['stoolBar', x1 - 2.4, z0 + 2.6, 0],
          ['pottedPlant', x0 + 0.7, z1 - 1.4, 0]
        ]);
      S.taburetes = [
        [x1 - 5.2, z0 + 2.6],
        [x1 - 3.8, z0 + 2.6],
        [x1 - 2.4, z0 + 2.6]
      ];
      S.mesasInt.forEach(([x, z]) => G.bloquea(x - 1.2, z - 0.7, x + 1.2, z + 0.7));
      for (let i = 0; i < 18; i++) cil(W, 0.04, 0.3, ['#5a1020', '#2e5d3a', '#c9a227'][i % 3], x0 + 1.2 + (i % 9) * 0.35, 0.3 + Math.floor(i / 9) * 0.6, z0 + 0.4, 6);
    } else if (tipo === 'tienda') {
      for (let i = 0; i < 3; i++) {
        const x = -4.5 + i * 3;
        caja(W, 2.2, 1.5, 0.5, '#d9d4cb', x, 0, 0.2);
        for (let k = 0; k < 6; k++) caja(W, 0.28, 0.5, 0.2, ['#c0392b', '#1d4f91', '#2e5d3a'][(i + k) % 3], x - 0.8 + k * 0.32, 0.6 + (k % 2) * 0.55, 0.2);
        G.bloquea(x - 1.2, -0.2, x + 1.2, 0.6);
      }
      for (let i = 0; i < 5; i++) caja(W, 1.2, 0.08, 0.35, '#c9b89a', x0 + 1 + i * 2.5, 1.3, z0 + 0.25);
      S.puntosInt = [
        [-4.5, 2.6],
        [-1.5, 2.6],
        [1.5, 2.6],
        [4.5, 2.6]
      ];
    } else if (tipo === 'gimnasio') {
      const negro = mat('#1d2024'),
        rojo = mat('#c0392b'),
        metal = mat('#40464e', { metalness: 0.6, roughness: 0.4 });
      for (let i = 0; i < 4; i++) {
        const x = x0 + 2 + i * 2.3;
        caja(W, 0.8, 0.18, 1.9, negro, x, 0, 0.6);
        caja(W, 0.06, 1.1, 0.06, metal, x - 0.38, 0, -0.3);
        caja(W, 0.06, 1.1, 0.06, metal, x + 0.38, 0, -0.3);
        caja(W, 0.8, 0.3, 0.12, rojo, x, 1.05, -0.3);
        G.bloquea(x - 0.5, -0.5, x + 0.5, 1.6);
      }
      for (let i = 0; i < 3; i++) caja(W, 1.8, 0.04, 0.8, mat('#2f6f9e'), -3 + i * 2.2, 0, z1 - 2.4);
      S.puntosInt = [
        [x0 + 2, 2.2],
        [x0 + 4.3, 2.2],
        [0, z1 - 2.4],
        [3, z1 - 2.4]
      ];
    } else if (tipo === 'escuela') {
      const pista = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6).rotateX(-Math.PI / 2), mat('#c98d4f'));
      pista.position.set(-1.5, 0.012, 1.4);
      W.add(pista);
      caja(W, 9, 0.014, 0.06, '#ffffff', -1.5, 0.012, 1.4);
      cil(W, 0.1, 3, '#333a40', -6.2, 0, 1.4);
      caja(W, 0.06, 1.0, 1.5, '#f4f4f4', -6.0, 2.4, 1.4);
      S.puntosInt = [
        [-4, 0],
        [-1, 3],
        [1.5, 0.4],
        [3, 3]
      ];
    } else if (tipo === 'academia') {
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < 4; i++) {
          const x = -4.5 + i * 2.4,
            z = 0.2 + r * 2.2;
          caja(W, 1.2, 0.08, 0.7, '#c9b89a', x, 0.7, z);
          caja(W, 0.08, 0.7, 0.08, '#40464e', x - 0.5, 0, z);
          caja(W, 0.08, 0.7, 0.08, '#40464e', x + 0.5, 0, z);
          caja(W, 0.5, 0.06, 0.5, '#7a5638', x, 0.45, z + 0.7);
          G.bloquea(x - 0.7, z - 0.4, x + 0.7, z + 0.4);
        }
      caja(W, 4, 1.2, 0.06, '#1f4d3a', -1, 0.9, z0 + 0.2);
      S.puntosInt = [
        [-3, 4],
        [0, 4],
        [3, 4]
      ];
    } else if (tipo === 'hotel') {
      S.mueblesPend = [
        ['loungeSofa', -4.5, 1.8, 90],
        ['loungeSofa', -4.5, -0.2, 90],
        ['tableCoffee', -3.2, 0.8, 0],
        ['pottedPlant', x0 + 0.7, z1 - 1.4, 0],
        ['pottedPlant', x1 - 0.7, z1 - 1.4, 0]
      ];
      caja(W, 2, 0.02, 3, '#8e2424', 0, 0.01, 2);
      S.puntosInt = [
        [-3.4, 2.6],
        [0, 3],
        [3, 2.4]
      ];
    } else {
      // clínica
      for (let i = 0; i < 3; i++) {
        const x = -4.5 + i * 3,
          camilla = caja(W, 0.8, 0.55, 1.9, '#e9eef2', x, 0, 0.4);
        void camilla;
        caja(W, 0.8, 0.12, 0.4, '#4a90a8', x, 0.55, -0.2);
        G.bloquea(x - 0.6, -0.7, x + 0.6, 1.5);
      }
      S.puntosInt = [
        [-3, 3],
        [0, 3],
        [3, 3]
      ];
    }
    luz(0, 0, 6);
    luz(-4, 2, 3);
    luz(4, 2, 3);
    return [0, z0 + 3.6];
  }
  // Empleados con su nombre y clientes según los del día; los fijos quedan en su puesto, el resto se mueve por el local
  async function poblar(S, M, st, nueva) {
    const n = negocio(st);
    if (!n) return;
    const T = GM.negocios.TIPOS[n.tipo],
      of = OFICIO[n.tipo] || 'empleado',
      cols = ['h-casual_2', 'm-casual', 'h-beach', 'm-formal', 'h-casual_hoodie'];
    const pos = [[S.zonaNegocio ? 0 : 0, 0]],
      mos = [
        [7 / 2 - 3.4 - 2, -5 + 2.4],
        [7 / 2 - 5.2, -5 + 2.4],
        [7 / 2 - 1.5, -5 + 2.4],
        [2, -5 + 2.4],
        [0, -5 + 2.4],
        [-2, -5 + 2.4]
      ];
    void pos;
    const emp = n.empleados.slice(0, 6);
    for (let i = 0; i < emp.length; i++) {
      const e = emp[i],
        p = await nueva({ modelo: cols[i % cols.length] }, e.nombre + ', ' + of + (e.animo < 40 ? ' (quemado/a)' : e.animo > 75 ? ' (contento/a)' : ''), i < 2);
      const q = i < 2 ? mos[i] : S.puntosInt[i % S.puntosInt.length];
      p.obj.position.set(q[0], 0, q[1]);
      if (i < 2) p.obj.rotation.y = 0;
    }
    const hoy = n.hoy ? n.hoy.clientes : 20,
      cl = clamp(Math.round(hoy / (n.tipo === 'gimnasio' ? 18 : 9)), 1, 9),
      sent = S.mesasInt || [];
    for (let i = 0; i < cl; i++) {
      const p = await nueva({}, 'Cliente');
      const q = S.puntosInt[(i * 3 + 1) % S.puntosInt.length];
      p.obj.position.set(q[0] + (i % 3) * 0.6, 0, q[1] + (i % 2) * 0.5);
      void sent;
      void T;
    }
  }
  const car = st => st.modo === 'carrera' && st.carrera;
  const hoyHecho = (st, k) => {
    st.sede = st.sede || { charlas: {} };
    const u = (st.sede.locales = st.sede.locales || {});
    if (u[k] === st.fecha) return true;
    u[k] = st.fecha;
    return false;
  };
  function acciones(st) {
    const n = negocio(st);
    if (!n) return [];
    const A = [
      {
        id: 'caja',
        t: 'Mirar la caja de hoy',
        d: n.hoy ? n.hoy.clientes + ' clientes, ' + n.hoy.perdidos + ' sin atender.' : 'Todavía no hay datos.',
        disponible: true,
        fn: () => ({
          ok: true,
          texto: n.hoy
            ? 'Hoy: ' +
              n.hoy.clientes +
              ' clientes, ' +
              Math.round(n.hoy.ingresos * 10) / 10 +
              ' mil € de ingresos y ' +
              n.hoy.perdidos +
              ' personas que no pudieron ser atendidas. Reputación ' +
              Math.round(n.reputacion) +
              '.'
            : 'Aún no ha abierto el día.'
        })
      },
      {
        id: 'mano',
        t: 'Echar una mano tras el mostrador',
        d: 'Reputación +0,6, fatiga +3.',
        disponible: true,
        fn: () => {
          if (hoyHecho(st, 'mano_' + n.id)) return { ok: false, motivo: 'Ya has ayudado hoy.' };
          n.reputacion = clamp(n.reputacion + 0.6, 5, 100);
          const y = st.jugadores && st.jugadores.yo;
          if (car(st) && y && y.estado) y.estado.fatiga = clamp(y.estado.fatiga + 3, 0, 100);
          return { ok: true, texto: 'Sirves unas mesas y los clientes se fijan. Reputación +0,6.' };
        }
      },
      {
        id: 'charla',
        t: 'Charlar con la plantilla',
        d: 'Ánimo del equipo +4.',
        disponible: true,
        fn: () => {
          if (hoyHecho(st, 'charla_' + n.id)) return { ok: false, motivo: 'Ya has hablado hoy con ellos.' };
          n.empleados.forEach(e => {
            e.animo = clamp(e.animo + 4, 0, 100);
          });
          return { ok: true, texto: 'Les preguntas cómo van. Se nota que lo agradecen (+4 de ánimo).' };
        }
      }
    ];
    return A;
  }
  GM.negociosMundo = { negocio, construir, poblar, acciones };
})();
