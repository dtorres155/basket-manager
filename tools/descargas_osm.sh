#!/bin/bash
# Repite las descargas de OpenStreetMap hasta que no falte ninguna ciudad (Overpass falla a menudo): transporte, plazas, partes de edificio y rutas de autobús.
# Uso: bash tools/descargas_osm.sh   (después: node tools/osm_generar.js y npm run build)
cd "$(dirname "$0")/.."; export PATH="/c/Program Files/nodejs:$PATH"
for i in $(seq 1 15); do
  node tools/osm_transporte.js > /tmp/d_tr.log 2>&1; node tools/osm_plazas.js > /tmp/d_pl.log 2>&1; node tools/osm_extra.js > /tmp/d_ex.log 2>&1
  fallos=$(cat /tmp/d_tr.log /tmp/d_pl.log /tmp/d_ex.log | grep -c "SIN DATOS"); echo "pasada $i: $fallos ciudades sin datos"; [ "$fallos" -eq 0 ] && break; sleep 120
done
