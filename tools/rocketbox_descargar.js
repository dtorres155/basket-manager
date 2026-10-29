// Descarga personajes de Microsoft Rocketbox (MIT, https://github.com/microsoft/Microsoft-Rocketbox) a recursos/rocketbox/<Personaje>/
// (fuera de git): el FBX y, de sus texturas TGA, solo color, relieve y opacidad (las de brillo no se usan). Unos 55 MB por personaje.
// Uso: node tools/rocketbox_descargar.js <Personaje> [...]   (Adults/Male_Adult_06, Professions/Police_Male_01... o solo el nombre)
// Después: node tools/rocketbox_convertir.js y node tools/rocketbox_optimizar.js
const fs = require('fs'),
  path = require('path');
const RB = path.join(__dirname, '..', 'recursos/rocketbox'),
  API = 'https://api.github.com/repos/microsoft/Microsoft-Rocketbox/contents/Assets/Avatars/',
  UA = { 'User-Agent': 'basket-manager-personal/1.0' };
const lista = async ruta => {
  const r = await fetch(API + ruta, { headers: UA });
  return r.ok ? r.json() : null;
};
(async () => {
  let total = 0;
  for (const arg of process.argv.slice(2)) {
    const nombre = arg.split('/').pop(),
      carpeta = arg.includes('/') ? arg.split('/')[0] : /^(Fe)?[Mm]ale_(Adult|Party)/.test(nombre) ? 'Adults' : /_Child_/.test(nombre) ? 'Children' : 'Professions',
      dest = path.join(RB, nombre);
    fs.mkdirSync(dest, { recursive: true });
    const exp = await lista(carpeta + '/' + nombre + '/Export'),
      tex = await lista(carpeta + '/' + nombre + '/Textures');
    if (!exp || !tex) {
      console.log('NO ESTÁ', nombre);
      continue;
    }
    const archivos = exp.filter(f => f.name === nombre + '.fbx').concat(tex.filter(f => /(color|normal)\.tga$/i.test(f.name)));
    for (const f of archivos) {
      const d = path.join(dest, f.name);
      if (fs.existsSync(d) && fs.statSync(d).size === f.size) continue;
      const r = await fetch(f.download_url, { headers: UA });
      if (!r.ok) {
        console.log('FALLA', f.name, r.status);
        continue;
      }
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(d, b);
      total += b.length;
    }
    console.log(nombre, archivos.length + ' archivos');
  }
  console.log('descargado ' + Math.round(total / 1048576) + ' MB');
})();
