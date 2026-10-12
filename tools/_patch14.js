const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,60)); s=s.replace(a,()=>b); };
// el cielo de reflejos se rehace con la altura y el rumbo reales del sol
r("u.sunPosition.value.setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(205));",
"const el = Math.max(0.02, S.solElev == null ? 0.55 : S.solElev); S.envElev = el; u.sunPosition.value.setFromSphericalCoords(1, Math.PI / 2 - el, S.solAzim == null ? 3.5 : Math.PI - S.solAzim);");
r("  function tonoCiudad(st) {",
"  // Al cambiar la altura del sol más de 0,1 rad se recalcula el cielo de reflejos (un PMREM pequeño, solo en exteriores)\n  function actualizarCielo() {\n    if (!S.scene.environment || S.envK !== 'ext' || S.envElev == null || Math.abs(Math.max(0.02, S.solElev) - S.envElev) < 0.1 || S.noche > 0.6) return;\n    const antes = S.scene.environment; S.envK = null; entorno(); if (S.scene.environment !== antes) { antes.dispose(); S.scene.environmentIntensity = S.envBase; } else S.envK = 'ext';\n  }\n  function tonoCiudad(st) {");
r("S.solElev = SO ? SO.posicion(SO.latitud(S.st), S.st.fecha, hs).elev : 0.9;",
"{ const pz = SO ? SO.posicion(SO.latitud(S.st), S.st.fecha, hs) : null; S.solElev = pz ? pz.elev : 0.9; S.solAzim = pz ? pz.azim : null; }");
r("if (S.scene.environment) S.scene.environmentIntensity = (S.envBase || 0.5) * (1 - noche * 0.75) * triste;",
"actualizarCielo(); if (S.scene.environment) S.scene.environmentIntensity = (S.envBase || 0.5) * (1 - noche * 0.75) * triste;");
fs.writeFileSync('sede3d.js',s);
