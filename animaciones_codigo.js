/* Biblioteca de animaciones por código (puntos 26 y 30): clips para el esqueleto común de Quaternius, que solo trae 11 (andar, correr, saludar...).
   Cada clip es una función del tiempo que da una pose por hueso; se muestrea y se convierte en un THREE.AnimationClip.
   Las poses se escriben en el marco del personaje (x a su izquierda, y arriba, z delante): { hueso: [rx, ry, rz] } gira el hueso alrededor de su articulación, y
   { hueso: { a: [x, y, z] } } apunta el hueso (brazo o pierna) en esa dirección; _dy mueve la cadera arriba o abajo (en longitudes de pierna).
   Un clip puede ir sobre otro (base): se conserva lo que el clip no toca (piernas al correr, respiración al estar quieto).
   Uso: GM.animCodigo.instalar(p, modelo) añade p.acc.<nombre> (se crean al pedirlos). Nombres en GM.animCodigo.nombres. Velocidades de paso: GM.animCodigo.VEL. */
(function () {
  const T = THREE,
    PI = Math.PI,
    S = Math.sin,
    C = Math.cos,
    FPS = 20;
  const AB = { UpperArm: 'LowerArm', LowerArm: 'Wrist', UpperLeg: 'LowerLeg', LowerLeg: 'Foot' };
  const cacheReposo = {},
    cacheClips = {};
  // Velocidad real de cada clip de locomoción (m/s con el personaje a escala 1; se mide con tools/anim_velocidad.js)
  const VEL = { walk: 1.3, sprint: 4.1 };

  function reposo(obj) {
    obj.updateMatrixWorld(true);
    const inv = obj.getWorldQuaternion(new T.Quaternion()).invert(),
      R = {},
      orden = [];
    obj.traverse(n => {
      if (!n.isBone) return;
      const w = n.getWorldQuaternion(new T.Quaternion());
      R[n.name] = { loc: n.quaternion.clone(), car: inv.clone().multiply(w), pos: n.position.clone(), padre: n.parent && n.parent.isBone ? n.parent.name : null, hijo: null };
      orden.push(n.name);
    });
    orden.forEach(nm => {
      const base = nm.replace(/[LR]$/, ''),
        lado = nm.slice(-1),
        h = AB[base];
      if (h && R[h + lado]) R[nm].hijo = R[h + lado].pos.clone().normalize();
    });
    const l = R.UpperLegL && R.LowerLegL && R.FootL ? R.LowerLegL.pos.length() + R.FootL.pos.length() : 0.8;
    R._pierna = l;
    R._orden = orden;
    return R;
  }
  // Evalúa una pose: devuelve { hueso: quaternion local } para los huesos que la pose toca
  function evaluar(R, pose) {
    const nuevo = {},
      car = {},
      out = {},
      q = new T.Quaternion(),
      q2 = new T.Quaternion();
    for (const nm of R._orden) {
      const r = R[nm],
        pc = r.padre ? car[r.padre] : null,
        e = pose[nm];
      let loc = r.loc;
      if (e) {
        if (Array.isArray(e)) {
          q.setFromEuler(new T.Euler(e[0], e[1], e[2], 'XYZ'));
          loc = r.loc.clone().multiply(r.car.clone().invert().multiply(q).multiply(r.car));
        } else if (e.a && r.hijo) {
          const q0 = pc ? pc.clone().multiply(r.loc) : r.loc.clone(),
            d0 = r.hijo.clone().applyQuaternion(q0),
            t = new T.Vector3(e.a[0], e.a[1], e.a[2]).normalize();
          q2.setFromUnitVectors(d0, t);
          const nc = q2.clone().multiply(q0);
          loc = pc ? pc.clone().invert().multiply(nc) : nc;
        }
        out[nm] = loc;
      }
      car[nm] = pc ? pc.clone().multiply(loc) : loc.clone();
    }
    return out;
  }
  const v = (lado, x, y, z) => ({ a: [lado === 'L' ? x : -x, y, z] }); // dirección con x positiva hacia fuera
  const brazos = (UL, LL, UR, LR) => ({ UpperArmL: v('L', ...UL), LowerArmL: v('L', ...LL), UpperArmR: v('R', ...UR), LowerArmR: v('R', ...LR) });
  const ABAJO = [0.12, -1, 0.05],
    REPOSO_L = [0.1, -0.95, 0.1];
  const mezcla = (a, b, k) => a + (b - a) * k,
    suave = x => x * x * (3 - 2 * x),
    rampa = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  // Agacharse: ángulo a de las caderas; devuelve piernas y bajada de cadera
  const agachar = a => ({ UpperLegL: [-a, 0, 0], UpperLegR: [-a, 0, 0], LowerLegL: [2 * a, 0, 0], LowerLegR: [2 * a, 0, 0], _dy: -(1 - C(a)) });

  // dur: segundos; lazo: false para que se quede en la última pose; base: clip del que se conserva el resto; f(t en segundos, u de 0 a 1) -> pose
  const DEFS = {
    hablar: {
      dur: 4,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return Object.assign(brazos([0.25, -0.85, 0.3], [0.12, 0.3 + 0.35 * S(2 * w), 0.9], [0.15, -0.95, 0.2], [0.1, -0.5 + 0.12 * S(w + 1), 0.85]), {
          Head: [0.06 * S(2 * w), 0.25 * S(w), 0],
          Chest: [0, 0.07 * S(w), 0]
        });
      }
    },
    hablar2: {
      dur: 5,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return Object.assign(brazos([0.4, -0.75, 0.4], [0.5 + 0.2 * S(w), 0.1 + 0.3 * S(2 * w + 1), 0.8], [0.4, -0.75, 0.4], [0.5 + 0.2 * S(w + 2), 0.2 + 0.3 * S(2 * w), 0.8]), {
          Head: [0.04, 0.2 * S(w + 2), 0.05 * S(w)],
          Chest: [0.03, 0, 0]
        });
      }
    },
    escuchar: {
      dur: 4,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return { Head: [0.12 + 0.1 * Math.max(0, S(2 * w * 1.5)), 0.12, 0.08], Chest: [0.03, 0, 0] };
      }
    },
    movil: {
      dur: 4,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return Object.assign(brazos(REPOSO_L.concat(), [0.1, -0.7, 0.6], [0.2, -0.55, 0.55], [-0.15, 0.1 + 0.04 * S(3 * w), 0.95]), {
          Head: [0.42 + 0.03 * S(w), 0, 0],
          Neck: [0.1, 0, 0],
          Chest: [0.05, 0, 0]
        });
      }
    },
    aplaudir: {
      dur: 1,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI * 3,
          k = 0.5 + 0.5 * S(w),
          x = mezcla(0.28, 0.02, k);
        return brazos([0.3, -0.5, 0.8], [x, 0.2, 0.95], [0.3, -0.5, 0.8], [x, 0.2, 0.95]);
      }
    },
    comer: {
      dur: 3,
      base: 'idle',
      f: (t, u) => {
        const k = suave(rampa(u, 0.1, 0.35)) * (1 - suave(rampa(u, 0.6, 0.85))),
          w = u * 2 * PI;
        return Object.assign(brazos(REPOSO_L.concat(), [0.1, -0.9, 0.3], [0.3, -0.6, 0.4], [-0.1, mezcla(0.1, 0.95, k), mezcla(0.9, 0.35, k)]), {
          Head: [0.05 + 0.1 * k, 0.08 * S(w), 0]
        });
      }
    },
    bolsas: {
      dur: 4,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return Object.assign(brazos([0.15, -0.97, 0.12], [0.1, -0.9, 0.35], [0.15, -0.97, 0.12], [0.1, -0.9, 0.35]), { Chest: [0, 0.03 * S(w), 0.02] });
      }
    },
    esperar: {
      dur: 6,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI,
          mira = suave(rampa(u, 0.2, 0.3)) * (1 - suave(rampa(u, 0.45, 0.55))) - suave(rampa(u, 0.65, 0.75)) * (1 - suave(rampa(u, 0.85, 0.95)));
        return Object.assign(brazos([0.15, -0.95, 0.1], [0.4, -0.8, 0.4], [0.2, -0.7, 0.3], [0.3, -0.5, 0.7]), {
          Head: [0, 0.7 * mira, 0],
          Chest: [0, 0.2 * mira, 0],
          Hips: [0, 0, 0.04 * S(w)]
        });
      }
    },
    celebrar: {
      dur: 1.2,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI * 2,
          h = Math.abs(S(w * 0.5));
        return Object.assign(brazos([0.45, 0.9 + 0.1 * S(w), 0.1], [0.5, 1, 0.1 + 0.15 * S(w)], [0.45, 0.9 + 0.1 * S(w + 1), 0.1], [0.5, 1, 0.1 + 0.15 * S(w + 1)]), {
          Head: [-0.15, 0, 0],
          Chest: [-0.12, 0.1 * S(w), 0],
          _dy: 0.06 * h
        });
      }
    },
    conducir: {
      dur: 4,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI;
        return Object.assign(brazos([0.25, -0.5, 0.75], [0.12, -0.2, 1], [0.25, -0.5, 0.75], [0.12, -0.2, 1]), { Head: [0, 0.08 * S(w), 0], Chest: [0.04, 0, 0] });
      }
    },
    patinete: {
      dur: 1.2,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI,
          k = Math.max(0, S(w));
        return Object.assign(brazos([0.2, -0.45, 0.8], [0.12, -0.15, 1], [0.2, -0.45, 0.8], [0.12, -0.15, 1]), {
          Chest: [0.1, 0, 0],
          UpperLegL: [-0.2, 0, 0],
          LowerLegL: [0.4, 0, 0],
          UpperLegR: [0.1 + 0.5 * k, 0, 0],
          LowerLegR: [0.1 + 0.4 * k, 0, 0],
          _dy: -0.03
        });
      }
    },
    escaleras: { dur: null, base: 'walk', f: (t, u) => ({ Chest: [0.1, 0, 0], Torso: [0.06, 0, 0] }) },
    bote: {
      dur: 1,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI * 2,
          k = 0.5 + 0.5 * S(w);
        return Object.assign(agachar(0.5), brazos([0.2, -0.9, 0.3], [0.3, -0.6, 0.6], [0.2, -0.55, 0.45], [0.12, mezcla(-0.95, -0.2, k), mezcla(0.25, 0.9, k)]), {
          Chest: [0.22, 0.12, 0],
          Head: [-0.15, 0, 0]
        });
      }
    },
    boteCorriendo: {
      dur: null,
      base: 'sprint',
      f: (t, u) => {
        const w = u * 2 * PI * 2,
          k = 0.5 + 0.5 * S(w);
        return Object.assign(brazos([0.2, -0.9, 0.3], [0.3, -0.6, 0.6], [0.2, -0.55, 0.45], [0.12, mezcla(-0.95, -0.2, k), mezcla(0.25, 0.9, k)]), { Chest: [0.25, 0, 0] });
      }
    },
    defensa: {
      dur: 0.8,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI,
          a = 0.55;
        return Object.assign(agachar(a), brazos([1, 0.1, 0.2], [1, 0.6, 0.3], [1, 0.1, 0.2], [1, 0.6, 0.3]), {
          Chest: [0.2, 0.1 * S(w), 0],
          Head: [-0.15, 0, 0],
          _dx: 0.06 * S(w),
          UpperLegL: [-a, 0, 0.3 + 0.05 * S(w)],
          UpperLegR: [-a, 0, -0.3 - 0.05 * S(w)],
          LowerLegL: [2 * a, 0, -0.3],
          LowerLegR: [2 * a, 0, 0.3]
        });
      }
    },
    tiro: {
      dur: 1.2,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const ag = suave(rampa(t, 0, 0.25)) * (1 - suave(rampa(t, 0.25, 0.4))) * 0.5 + 0.1 * (1 - suave(rampa(t, 0.9, 1.1))),
          salto = Math.sin(PI * rampa(t, 0.3, 0.85)) * 0.2;
        const sube = suave(rampa(t, 0.2, 0.5)),
          suelta = suave(rampa(t, 0.5, 0.62)),
          baja = suave(rampa(t, 0.85, 1.15));
        const ur = [0.25, mezcla(mezcla(-0.5, 0.45, sube), 0.95, suelta), mezcla(mezcla(0.55, 0.3, sube), 0.15, suelta)],
          lr = [0.15, mezcla(mezcla(0.35, 0.95, sube), 1, suelta), mezcla(0.5, 0.2, suelta)];
        const mb = 1 - baja;
        return Object.assign(agachar(ag), brazos([0.2, mezcla(-0.9, 0.5, sube * mb), 0.3], [0.3, mezcla(-0.2, 0.7, sube * mb), 0.6], ur, lr), {
          Head: [-0.1 * sube, 0, 0],
          Chest: [mezcla(0.15, -0.1, sube), 0, 0],
          _dy: -(1 - C(ag)) + salto
        });
      }
    },
    mate: {
      dur: 1.5,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const ag = suave(rampa(t, 0, 0.35)) * (1 - suave(rampa(t, 0.35, 0.5))) * 0.7 + 0.2 * suave(rampa(t, 1.2, 1.4)),
          salto = Math.sin(PI * rampa(t, 0.4, 1.15)) * 0.55;
        const arr = suave(rampa(t, 0.4, 0.75)),
          mete = suave(rampa(t, 0.78, 0.92)),
          cuelga = suave(rampa(t, 0.95, 1.15));
        const ur = [0.3, mezcla(mezcla(-0.3, 1, arr), 0.15, mete), mezcla(0.4, 0.2, arr)],
          lr = [0.2, mezcla(mezcla(0.4, 1, arr), -0.9, mete), 0.3];
        return Object.assign(agachar(ag), brazos([0.2, mezcla(-0.8, 0.9, arr * (1 - cuelga)), 0.3], [0.3, mezcla(-0.3, 0.9, arr * (1 - cuelga)), 0.5], ur, lr), {
          Chest: [mezcla(0.2, -0.2, arr), 0, 0],
          UpperLegL: [-ag - 0.9 * arr * (1 - suave(rampa(t, 0.8, 1.05))), 0, 0],
          UpperLegR: [-ag - 0.4 * arr * (1 - suave(rampa(t, 0.8, 1.05))), 0, 0],
          LowerLegL: [2 * ag + 1.0 * arr * (1 - suave(rampa(t, 0.8, 1.05))), 0, 0],
          LowerLegR: [2 * ag + 0.7 * arr * (1 - suave(rampa(t, 0.8, 1.05))), 0, 0],
          _dy: -(1 - C(ag)) + salto
        });
      }
    },
    rebote: {
      dur: 1.2,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const ag = suave(rampa(t, 0, 0.25)) * (1 - suave(rampa(t, 0.25, 0.4))) * 0.5 + 0.35 * suave(rampa(t, 0.9, 1.1)),
          salto = Math.sin(PI * rampa(t, 0.3, 0.85)) * 0.3,
          arr = suave(rampa(t, 0.3, 0.5)) * (1 - suave(rampa(t, 0.62, 0.8)));
        const pecho = suave(rampa(t, 0.7, 0.9));
        return Object.assign(
          agachar(ag),
          brazos(
            [0.3, mezcla(0.9 * arr + -0.5 * (1 - arr), 0.1, pecho), mezcla(0.1, 0.5, pecho)],
            [0.3, mezcla(arr, -0.3, pecho), mezcla(0.1, 0.8, pecho)],
            [0.3, mezcla(0.9 * arr + -0.5 * (1 - arr), 0.1, pecho), mezcla(0.1, 0.5, pecho)],
            [0.3, mezcla(arr, -0.3, pecho), mezcla(0.1, 0.8, pecho)]
          ),
          { Head: [-0.2 * arr, 0, 0], _dy: -(1 - C(ag)) + salto }
        );
      }
    },
    pase: {
      dur: 0.7,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const a = suave(rampa(t, 0, 0.25)),
          b = suave(rampa(t, 0.25, 0.4)),
          c = suave(rampa(t, 0.5, 0.7));
        const x = mezcla(mezcla(0.2, 0.05, a), 0.12, b),
          z = mezcla(mezcla(0.5, 0.2, a), 1, b);
        return Object.assign(
          brazos(
            [0.3, -0.5, mezcla(0.5, 0.9, b) * (1 - c) + 0.2 * c],
            [x + 0.1, mezcla(-0.2, 0.05, b), z],
            [0.3, -0.5, mezcla(0.5, 0.9, b) * (1 - c) + 0.2 * c],
            [x + 0.1, mezcla(-0.2, 0.05, b), z]
          ),
          { Chest: [mezcla(0.1, -0.08, b), 0, 0] }
        );
      }
    },
    tapon: {
      dur: 0.9,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const ag = suave(rampa(t, 0, 0.2)) * (1 - suave(rampa(t, 0.2, 0.3))) * 0.5 + 0.2 * suave(rampa(t, 0.75, 0.9)),
          salto = Math.sin(PI * rampa(t, 0.25, 0.8)) * 0.3,
          up = suave(rampa(t, 0.25, 0.45)) * (1 - suave(rampa(t, 0.62, 0.8))),
          sw = Math.sin(PI * rampa(t, 0.45, 0.7));
        return Object.assign(
          agachar(ag),
          brazos([0.2, -0.9, 0.2], [0.2, -0.8, 0.3], [0.2, mezcla(-0.9, 0.95, up), mezcla(0.1, 0.3, up)], [0.1, mezcla(-0.5, 0.9, up), mezcla(0.3, 0.4 + 0.5 * sw, up)]),
          { Chest: [-0.12 * up, 0, 0], _dy: -(1 - C(ag)) + salto }
        );
      }
    },
    robo: {
      dur: 0.6,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const k = Math.sin(PI * rampa(t, 0.1, 0.5));
        return Object.assign(
          agachar(0.35 * k),
          brazos([0.2, -0.9, 0.2], [0.2, -0.8, 0.3], [0.2, mezcla(-0.9, -0.1, k), mezcla(0.1, 0.9, k)], [0.1, mezcla(-0.5, -0.3, k), mezcla(0.3, 1, k)]),
          { Chest: [0.25 * k, 0, 0] }
        );
      }
    },
    bandeja: {
      dur: 1,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const arr = suave(rampa(t, 0.2, 0.5)) * (1 - suave(rampa(t, 0.7, 0.95))),
          salto = Math.sin(PI * rampa(t, 0.25, 0.8)) * 0.28,
          ag = 0.3 * suave(rampa(t, 0, 0.2)) * (1 - suave(rampa(t, 0.2, 0.3)));
        return Object.assign(agachar(ag), brazos([0.25, -0.5, 0.5], [0.2, 0.2, 0.8], [0.2, mezcla(-0.5, 0.95, arr), mezcla(0.5, 0.1, arr)], [0.1, mezcla(0.3, 1, arr), 0.2]), {
          UpperLegR: [-ag - 1.1 * arr, 0, 0],
          LowerLegR: [2 * ag + 1.2 * arr, 0, 0],
          Chest: [0.1 - 0.1 * arr, 0, 0],
          _dy: -(1 - C(ag)) + salto
        });
      }
    },
    celebrar2: {
      dur: 1.2,
      base: 'idle',
      f: (t, u) => {
        const w = u * 2 * PI * 2,
          h = Math.abs(S(w * 0.5));
        return Object.assign(brazos([0.25, 0.95, 0.1], [0.2, 1, 0.2 * S(w)], [0.15, -0.9, 0.1], [0.1, -0.7, 0.4]), {
          Head: [-0.2, 0.15 * S(w), 0],
          Chest: [-0.1, 0.15 * S(w), 0],
          _dy: 0.05 * h
        });
      }
    },
    arbitro: {
      dur: 2,
      lazo: false,
      base: 'idle',
      f: (t, u) => {
        const a = suave(rampa(t, 0, 0.3)) * (1 - suave(rampa(t, 1.5, 1.9)));
        return brazos(
          REPOSO_L.concat(),
          [0.1, -0.9, 0.25],
          [mezcla(0.1, 0.4, a), mezcla(-0.95, 0.9, a), mezcla(0.1, 0.1, a)],
          [mezcla(0.1, 0.1, a), mezcla(-0.5, 1, a), mezcla(0.4, 0.15, a)]
        );
      }
    }
  };
  DEFS.libre = {
    dur: 2,
    lazo: false,
    base: 'idle',
    f: (t, u) => {
      const p = DEFS.tiro.f(Math.min(1.2, t * 0.7), u);
      p._dy *= 0.2;
      return p;
    }
  };
  const nombres = Object.keys(DEFS);

  function clipDe(modelo, nombre, R, an, ANIM) {
    const clave = modelo + '|' + nombre;
    if (cacheClips[clave]) return cacheClips[clave];
    const d = DEFS[nombre],
      bc = d.base && an.animations.find(a => a.name === ANIM[d.base]),
      dur = d.dur || (bc ? bc.duration : 1),
      n = Math.max(2, Math.round(dur * FPS) + (d.lazo === false ? 1 : 0)),
      tiempos = [],
      poses = [];
    for (let i = 0; i < n; i++) {
      const t = d.lazo === false ? i / FPS : (i * dur) / n;
      tiempos.push(t);
      poses.push(d.f(t, t / dur));
    }
    const huesos = new Set(),
      q = new T.Quaternion();
    poses.forEach(p =>
      Object.keys(p).forEach(k => {
        if (k[0] !== '_') huesos.add(k);
      })
    );
    const evals = poses.map(p => evaluar(R, p)),
      pistas = [];
    let hip = false;
    huesos.forEach(nm => {
      const vals = [];
      let prev = null;
      for (let i = 0; i < n; i++) {
        const e = evals[i][nm] || R[nm].loc;
        q.copy(e);
        if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
        prev = q.clone();
        vals.push(q.x, q.y, q.z, q.w);
      }
      pistas.push(new T.QuaternionKeyframeTrack(nm + '.quaternion', tiempos.slice(0, n), vals));
    });
    if (poses.some(p => p._dy || p._dx)) {
      hip = true;
      const hp = R.Hips.pos,
        vals = [];
      for (let i = 0; i < n; i++) vals.push(hp.x + (poses[i]._dx || 0) * R._pierna, hp.y + (poses[i]._dy || 0) * R._pierna, hp.z);
      pistas.push(new T.VectorKeyframeTrack('Hips.position', tiempos.slice(0, n), vals));
    }
    if (bc)
      bc.tracks.forEach(tr => {
        const nm = tr.name.split('.')[0];
        if (huesos.has(nm) && /quaternion/.test(tr.name)) return;
        if (hip && tr.name === 'Hips.position') return;
        const c = tr.clone();
        if (!d.dur || d.dur !== bc.duration) {
          const k = dur / bc.duration;
          if (k !== 1) for (let i = 0; i < c.times.length; i++) c.times[i] *= k;
        }
        pistas.push(c);
      });
    return (cacheClips[clave] = new T.AnimationClip('cod_' + nombre, dur, pistas));
  }
  // p: { mixer, acc, obj }; ANIM: nombres de los clips del pack; an: gltf de animaciones
  function instalar(p, modelo, an, ANIM) {
    const R = cacheReposo[modelo] || (cacheReposo[modelo] = reposo(p.obj));
    nombres.forEach(nm => {
      let a = null;
      Object.defineProperty(p.acc, nm, {
        configurable: true,
        enumerable: true,
        get() {
          if (!a) {
            a = p.mixer.clipAction(clipDe(modelo, nm, R, an, ANIM));
            if (DEFS[nm].lazo === false) {
              a.setLoop(T.LoopOnce, 1);
              a.clampWhenFinished = true;
            }
          }
          return a;
        }
      });
    });
    ['saludar', 'abrirPuerta'].forEach(nm => {
      const src = nm === 'saludar' ? 'emote-yes' : 'interact-right';
      if (!(nm in p.acc)) p.acc[nm] = p.acc[src];
    });
  }
  // Aplica una pose fija (sin los huesos de las piernas) a una persona ya creada: conductores y gente sentada con los brazos en su sitio
  function pose(p, nombre, t) {
    const R = cacheReposo[p.modelo],
      d = DEFS[nombre];
    if (!R || !d) return;
    const out = evaluar(R, d.f(t || 0, (t || 0) / (d.dur || 1)));
    for (const nm in out) if (!/Leg|Foot|PT|Hips|Body|Root/.test(nm) && p.huesos[nm]) p.huesos[nm].quaternion.copy(out[nm]);
  }
  GM.animCodigo = { pose, instalar, nombres: nombres.concat(['saludar', 'abrirPuerta']), VEL, DEFS, _reposo: reposo, _evaluar: evaluar };
})();
