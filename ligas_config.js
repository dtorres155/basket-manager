/* LIGAS COMO DATOS (punto 68, GM.registrarLiga) — para que una liga nueva entre sin tocar código. Cada módulo que tenía una tabla con una entrada por liga (sueldos y topes en mercado.js, taquilla e ingresos en
   finanzas.js, niveles y nombres en carrera.js y entrenador.js, fechas en competiciones.js, copas en copas.js, especialidades de ojeadores…) la pide con GM.tabla('módulo.campo', { …las siete ligas de siempre… })
   (o GM.lista para las listas) y este registro le añade las entradas de cada liga nueva. Una liga nueva se escribe en datos_ligas_extra.js con GM.registrarLiga({ id, nombre, pais, formato, clubes, params })
   (los clubes son filas de GM.club: con plantilla real si la hay y, si no, relleno ficticio con nombres del país) y todo lo demás sale de params o de valores razonables por defecto. Este archivo se carga el primero
   después del núcleo (build.js y load.js). Expone: tabla, lista, registrarLiga, ligasExtra, selfTest. */
(function () {
  const tablas = {}, listas = {}, defs = [];
  // Campos de params -> tabla de cada módulo. Si falta alguno se usa el valor por defecto de abajo (una liga nacional de nivel medio)
  const POR_DEFECTO = { fact: 0.06, minsal: 0.1e6, maxsal: 2e6, esc: { precio: 18, merch: 2, tv: 0.04e6 }, baseLiga: 0.3, minOvr: 56, nivel: 2, tier: 2, factorTier: 0.72, ligaSal: 0.9, fechas: { ini: '-10-03', fin: '-05-03', po: '-05-09' } };
  const MAPA = {
    'mercado.fact': d => d.fact, 'mercado.minsal': d => d.minsal, 'mercado.maxsal': d => d.maxsal, 'finanzas.esc': d => d.esc, 'finanzas.base': d => d.baseLiga,
    'carrera.min': d => d.minOvr, 'carrera.nivel': d => d.nivel, 'carrera.nomliga': d => d.nombreLiga, 'carrera.tier': d => d.tier, 'carrera.factortier': d => d.factorTier,
    'entrenador.nivel': d => d.nivel, 'entrenador.nomliga': d => d.nombreLiga, 'ojeadores.espec': d => d.espec, 'ojeadores.nomliga': d => d.nombreLiga, 'economia.ligasal': d => d.ligaSal, 'competiciones.fechas': d => d.fechas,
    'prueba.fact': d => d.fact, 'copas.def': d => (d.copa ? { liga: d.id, nombre: d.copa.nombre, fecha: y => (y + 1) + d.copa.fecha, min: d.copa.min || 12 } : undefined)
  };
  const CLAVE_COPA = d => (d.copa && d.copa.id) || ('COPA_' + d.id);
  function completar(def) {
    const p = Object.assign({}, POR_DEFECTO, def.params || {}); p.nombreLiga = p.nombreLiga || def.nombre; p.espec = p.espec || ('Ojeo en ' + (def.nombre || def.id)); p.copa = def.copa || (def.params && def.params.copa) || null; p.id = def.id; return p;
  }
  function aplicarDef(nombreTabla, tabla, d) { const f = MAPA[nombreTabla]; if (!f) return; const v = f(d); if (v === undefined) return; if (nombreTabla === 'copas.def') tabla[CLAVE_COPA(d)] = v; else tabla[d.id] = v; }
  // Un módulo registra su tabla (objeto con las ligas de siempre) y recibe las de las ligas ya registradas
  function tabla(nombre, base) { tablas[nombre] = base; defs.forEach(d => aplicarDef(nombre, base, d)); return base; }
  function lista(nombre, base) { listas[nombre] = base; defs.forEach(d => { if (base.indexOf(d.id) < 0 && !(d.ocultaEn || []).includes(nombre)) base.push(d.id); }); return base; }
  const ligasExtra = () => defs.map(d => ({ id: d.id, nombre: d.nombre, pais: d.pais, formato: d.formato }));
  function registrarLiga(def) {
    if (!def || !def.id || !def.nombre) throw new Error('La liga necesita id y nombre');
    if (defs.some(d => d.id === def.id)) return; const p = completar(def); defs.push(Object.assign(p, { nombre: def.nombre, pais: def.pais, formato: def.formato || 'liga_simple' }));
    Object.keys(tablas).forEach(n => aplicarDef(n, tablas[n], p)); Object.keys(listas).forEach(n => { if (listas[n].indexOf(def.id) < 0) listas[n].push(def.id); });
    // los clubes y la liga entran con los demás datos (GM.club ya los dejó en el paquete si vienen en def.clubes)
    const ids = (def.equipos || []).slice(); (def.clubes || []).forEach(c => { const real = GM.plantillasExtra && GM.plantillasExtra[c.def[0]]; const e = GM.club(c.def, real || c.filas || [], c.opt || {}); ids.push(e.id); });   // plantillas reales importadas (tools/importar_plantillas_extra.js) o relleno ficticio
    GM._pack.ligas.push({ id: def.id, nombre: def.nombre, pais: def.pais, formato: def.formato || 'liga_simple', equipos: ids });
  }
  function selfTest() {
    const t = tabla('prueba.fact', { NBA: 1 }); registrarLiga({ id: 'ZZZ', nombre: 'Liga de prueba', pais: 'ES', equipos: [], params: { fact: 0.05 } }); const l = lista('prueba.lista', ['NBA']), u = defs.find(d => d.id === 'ZZZ');
    const ok = t.NBA === 1 && t.ZZZ === 0.05 && l.indexOf('ZZZ') >= 0 && u.fechas.ini === '-10-03'; delete t.ZZZ; defs.splice(defs.indexOf(u), 1); GM._pack.ligas = GM._pack.ligas.filter(x => x.id !== 'ZZZ'); delete tablas['prueba.fact']; delete listas['prueba.lista']; return ok;
  }
  GM.tabla = tabla; GM.lista = lista; GM.registrarLiga = registrarLiga; GM.ligasExtra = ligasExtra; GM.ligasConfig = { selfTest, defs };
  GM.register && GM.register('ligasConfig', GM.ligasConfig);
})();
