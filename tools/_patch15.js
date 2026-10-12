const fs=require('fs'); let s=fs.readFileSync('tools/osm_descargar.js','utf8');
const a="    const c = await centro(id, ciudad, pais, pab);";
if(!s.includes(a)) throw 1;
s=s.replace(a,"    const ov = fs.existsSync(path.join(DIR, 'centros.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'centros.json'), 'utf8'))[id] : null;   // centro corregido a mano cuando Nominatim no encuentra el pabellón\n    const c = ov ? { lat: ov[0], lon: ov[1], de: ov[2] } : await centro(id, ciudad, pais, pab);");
fs.writeFileSync('tools/osm_descargar.js',s);
