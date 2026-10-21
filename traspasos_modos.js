/* TRASPASOS EN LOS OTROS MODOS (punto 65, ampliación; GM.traspasosModos) — traspasos.js es el mercado del gestor; aquí el entrenador y el jugador de carrera también viven el mercado.
   - Entrenador: la directiva negocia por ti. Pides un fichaje (`delegar`) y cada dos días su director hace una oferta en rondas (empieza por debajo y sube según la confianza que tengas); acaba en acuerdo
     o en ruptura y sale en las noticias y en el historial de la directiva. Si un club puja por uno de tus jugadores te consultan: puedes aprobar o vetar.
   - Carrera: tu representante te avisa por el móvil cuando un club se interesa por ti (con el mercado abierto) y, si le dejas, negocia entre tu club y el interesado en rondas (un mensaje por ronda).
     Si hay acuerdo aparece una oferta de traspaso con tu contrato en Carrera; también puedes pedirle que busque salida a un club concreto (`pedirSalir`).
   Estado: state.mercadoPlus.del = [{ id, jugId, tipo, ses, ronda, next, estado, log }] (entrenador); state.carrera.traspaso = { clubId, ronda, next, estado, log, precio } (carrera). Prueba: t_traspasos_modos.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    T = () => GM.traspasos,
    M = () => GM.mods.mercado,
    F = () => GM.mods.finanzas,
    eur = v => U.eur(Math.round(v));
  const entr = st => st && st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo',
    carr = st => st && st.modo === 'carrera' && st.carrera && st.carrera.fase !== 'retirado' && st.jugadores.yo && st.jugadores.yo.equipoId;
  // ---------- Entrenador: la directiva negocia ----------
  const delegados = st => (T().est(st).del = T().est(st).del || []);
  function delegar(st, jugId) {
    if (!entr(st)) return { ok: false, motivo: 'Solo el entrenador delega en la directiva.' };
    const E = T().est(st),
      c = st.entrenador,
      p = st.jugadores[jugId];
    if (!p || !p.equipoId || p.equipoId === st.clubId) return { ok: false, motivo: 'Elige un jugador de otro club.' };
    if (delegados(st).filter(d => d.estado === 'en curso').length >= 2) return { ok: false, motivo: 'La directiva ya negocia dos fichajes.' };
    if (c.peticiones < 1) return { ok: false, motivo: 'Ya has pedido demasiado. Espera unas semanas.' };
    const r = T().abrir(st, jugId, 'comprar');
    if (!r.ok) return r;
    c.peticiones -= 1;
    const d = { id: 'dg' + ++E.seq, jugId, tipo: 'comprar', ses: r.sesion.id, ronda: 0, next: U.addDays(st.fecha, 1), estado: 'en curso', log: [], inicio: st.fecha };
    delegados(st).push(d);
    GM.noticia && GM.noticia(st, 'La directiva abre negociaciones por ' + p.nombre + ' (' + st.equipos[p.equipoId].nombre + ').');
    return { ok: true, negociacion: d };
  }
  function pasoDirectiva(st, d) {
    const E = T().est(st),
      ses = E.ses[d.ses],
      p = st.jugadores[d.jugId];
    if (!ses || ses.estado !== 'abierta') {
      d.estado = 'fallido';
      d.log.push('La negociación se ha cerrado.');
      return;
    }
    d.ronda++;
    const conf = st.entrenador.confianza,
      tope = F() ? st.finanzas[st.clubId].caja * 0.5 : 1e12;
    let precio = d.contra || Math.round((ses.reserva * clamp(0.78 + 0.07 * d.ronda + (conf - 50) / 500, 0.7, 1.15)) / 50000) * 50000;
    precio = Math.min(precio, Math.round(tope / 50000) * 50000);
    const r = T().proponer(st, ses.id, { precio, jugadores: [] });
    d.log.push('Ronda ' + d.ronda + ': ofrecen ' + eur(precio) + '. ' + r.mensaje);
    d.contra = r.contra ? r.contra.precio : null;
    if (r.estado === 'acepta') {
      const c = T().cerrar(st, ses.id);
      if (c.ok) {
        d.estado = 'hecho';
        st.entrenador.confianza = clamp(st.entrenador.confianza + 1, 0, 100);
        GM.noticia && GM.noticia(st, 'La directiva cierra el fichaje de ' + p.nombre + ' por ' + eur(precio) + '.');
        st.entrenador.hitos.unshift({ fecha: st.fecha, texto: 'La directiva atiende tu petición y ficha a ' + p.nombre + '.' });
      } else {
        d.estado = 'fallido';
        d.log.push(c.motivo);
        GM.noticia && GM.noticia(st, 'La directiva no consigue cerrar a ' + p.nombre + ': ' + c.motivo);
      }
    } else if (r.estado === 'rompe') {
      d.estado = 'fallido';
      st.entrenador.confianza = clamp(st.entrenador.confianza - 1, 0, 100);
      GM.noticia && GM.noticia(st, 'Se rompe la negociación por ' + p.nombre + '.');
    }
  }
  // ---------- Carrera: tu representante negocia ----------
  const estC = st => st.carrera.traspaso || null;
  function interes(st, clubId) {
    return { clubId, precio: Math.round(M().valorIA(st, 'yo', clubId) / 50000) * 50000 };
  }
  function rolEn(st, clubId) {
    const p = st.jugadores.yo,
      top = st.equipos[clubId].plantilla
        .map(i => st.jugadores[i])
        .filter(Boolean)
        .sort((a, b) => b.ovr - a.ovr),
      r = top.filter(q => q.ovr > p.ovr).length;
    return r < 5 ? 'Titular' : r < 8 ? 'Rotación' : 'Banquillo';
  }
  function empezarCarrera(st, clubId, nota) {
    const c = st.carrera,
      p = st.jugadores.yo;
    if (estC(st) && estC(st).estado === 'en curso') return { ok: false, motivo: 'Tu representante ya está negociando.' };
    if (clubId === p.equipoId || !st.equipos[clubId]) return { ok: false, motivo: 'Club no válido.' };
    const cerr = T().motivoCerrado(st, [p.equipoId, clubId]);
    if (cerr) return { ok: false, motivo: cerr };
    c.traspaso = { clubId, ronda: 0, next: U.addDays(st.fecha, 1), estado: 'en curso', log: [], inicio: st.fecha, nota: nota || '' };
    GM.mods.movil && GM.mods.movil.enviar(st, 'agente', 'Me pongo con el traspaso a ' + st.equipos[clubId].nombre + '. Te voy contando.');
    return { ok: true };
  }
  const pedirSalir = (st, clubId) => (carr(st) ? empezarCarrera(st, clubId, 'a petición tuya') : { ok: false, motivo: 'Solo en el modo carrera.' });
  function pasoCarrera(st) {
    const c = st.carrera,
      N = estC(st);
    if (!N || N.estado !== 'en curso' || st.fecha < N.next) return;
    const p = st.jugadores.yo,
      vend = st.equipos[p.equipoId],
      comp = st.equipos[N.clubId],
      Mv = GM.mods.movil;
    N.ronda++;
    N.next = U.addDays(st.fecha, 2);
    const cerr = T().motivoCerrado(st, [p.equipoId, N.clubId]);
    if (cerr) {
      N.estado = 'roto';
      Mv && Mv.enviar(st, 'agente', 'Se cierra el mercado y no hemos llegado a tiempo.');
      return;
    }
    const dv = T().DIRECTORES[{ 0: 'duro', 1: 'justo', 2: 'flexible' }[(U.hash(p.equipoId + 'director') >>> 0) % 3]],
      intocable = vend.plantilla
        .map(i => st.jugadores[i])
        .filter(Boolean)
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 2)
        .some(q => q.id === 'yo');
    const reserva = Math.round((M().precioMinimo(st, 'yo') * dv.res * (intocable ? 1.25 : 1)) / 50000) * 50000,
      techo = Math.round((M().valorIA(st, 'yo', N.clubId) * 1.14) / 50000) * 50000,
      oferta = Math.round(Math.min(techo, M().valorIA(st, 'yo', N.clubId) * (0.85 + 0.1 * N.ronda)) / 50000) * 50000;
    N.precio = oferta;
    N.log.push(
      'Ronda ' +
        N.ronda +
        ': ' +
        comp.nombre +
        ' ofrece ' +
        eur(oferta) +
        (oferta >= reserva ? ' y ' + vend.nombre + ' acepta.' : ' (' + vend.nombre + ' pide ' + eur(reserva) + ').')
    );
    if (oferta >= reserva) {
      N.estado = 'acuerdo';
      const salario = Math.round((M().salarioPedido(st, 'yo', N.clubId) * 1.05) / 10000) * 10000,
        anos = p.edad <= 26 ? 3 : 2;
      c.ofertas = (c.ofertas || []).filter(o => o.tipo !== 'Traspaso');
      c.ofertas.unshift({
        id: 'oT' + N.ronda + st.fecha.replace(/-/g, ''),
        clubId: N.clubId,
        liga: M().ligaDe(st, N.clubId),
        tipo: 'Traspaso',
        rol: rolEn(st, N.clubId),
        salario,
        anos,
        nota: 'Traspaso negociado por tu representante (' + eur(oferta) + ').'
      });
      Mv &&
        Mv.enviar(
          st,
          'agente',
          '¡Hay acuerdo entre los clubes! ' +
            comp.nombre +
            ' paga ' +
            eur(oferta) +
            ' y te ofrece ' +
            eur(salario) +
            ' al año durante ' +
            anos +
            ' temporadas, como ' +
            c.ofertas[0].rol.toLowerCase() +
            '. Mira la oferta en Carrera y decide.'
        );
      GM.noticia && GM.noticia(st, 'Tu representante cierra el traspaso entre los clubes: tienes una oferta de ' + comp.nombre + '.');
    } else if (N.ronda >= 4) {
      N.estado = 'roto';
      Mv && Mv.enviar(st, 'agente', 'Tras cuatro rondas, ' + vend.nombre + ' no baja de ' + eur(reserva) + '. Lo dejamos por ahora.');
      p.estado.moral = clamp(p.estado.moral - 3, 20, 100);
    } else Mv && Mv.enviar(st, 'agente', 'Ronda ' + N.ronda + ' con ' + vend.nombre + ': ' + comp.nombre + ' sube a ' + eur(oferta) + ' y ellos piden más. Sigo.');
  }
  // Una consulta de un club interesado llega al móvil con decisión
  function consulta(st) {
    const p = st.jugadores.yo,
      c = st.carrera;
    if (estC(st) && estC(st).estado === 'en curso') return;
    const v = T().ventana(st, st.clubId);
    if (!v.abierta) return;
    const prob = 0.04 + clamp((p.ovr - 60) / 600, 0, 0.08) + clamp(c.fama / 2500, 0, 0.04);
    if (((U.hash(st.fecha + String(st.seed) + 'consulta') >>> 0) % 1000) / 1000 > prob) return;
    const cand = Object.keys(st.equipos)
      .filter(
        id =>
          id !== p.equipoId &&
          st.equipos[id].plantilla.length < M().MAXP + 1 &&
          !T().motivoCerrado(st, [p.equipoId, id]) &&
          st.equipos[id].reputacion >= (st.equipos[p.equipoId].reputacion || 50) - 6
      )
      .sort((a, b) => U.hash(a + st.fecha) - U.hash(b + st.fecha))[0];
    if (!cand) return;
    const i = interes(st, cand);
    GM.mods.movil &&
      GM.mods.movil.enviar(
        st,
        'agente',
        st.equipos[cand].nombre +
          ' se interesa por ti: valdrían unos ' +
          eur(i.precio) +
          ' para ' +
          st.equipos[p.equipoId].nombre +
          '. ¿Quieres que abra una negociación entre los clubes?',
        {
          tipo: 'traspaso',
          clubId: cand,
          ops: [
            { t: 'Sí, que negocie', d: 'Tu representante habla con los dos clubes.' },
            { t: 'No me interesa', d: 'Sigues donde estás.' }
          ]
        }
      );
  }
  function responderAgente(st, dec, i) {
    if (i === 0) {
      const r = empezarCarrera(st, dec.clubId, 'por su interés');
      return r.ok ? { ok: true, efectos: ['negociación abierta'] } : r;
    }
    return { ok: true, efectos: [] };
  }
  // ---------- Día a día ----------
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (!st || !st.mercado) return;
    try {
      if (entr(st) && st.mercadoPlus) {
        delegados(st)
          .filter(d => d.estado === 'en curso' && st.fecha >= d.next)
          .forEach(d => {
            d.next = U.addDays(st.fecha, 2);
            pasoDirectiva(st, d);
          });
        if (delegados(st).length > 12) T().est(st).del = delegados(st).slice(-12);
      }
      if (carr(st)) {
        pasoCarrera(st);
        if (U.weekday(st.fecha) === 1) consulta(st);
      }
    } catch (e) {
      console.error('traspasosModos', e);
    }
  });
  function selfTest() {
    return typeof delegar === 'function' && typeof pedirSalir === 'function' && typeof responderAgente === 'function';
  }
  GM.traspasosModos = { delegar, delegados, pasoDirectiva, pedirSalir, pasoCarrera, responderAgente, consulta, interes, selfTest };
  GM.register && GM.register('traspasosModos', GM.traspasosModos);
})();
