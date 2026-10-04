/* Cierre de datos NBA: define la liga con los 30 equipos cargados antes. */
GM.commitDatos([{ id: 'NBA', nombre: 'NBA', pais: 'US', formato: 'nba', equipos: GM._pack.equipos.map(e => e.id) }]);
