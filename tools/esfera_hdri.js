// Comprobación del giro del cielo HDRI: una esfera espejo con el HDRI «dia», girada con la fórmula de sede_luz.js; imprime el azimut del reflejo del sol (debe aproximarse a azW). Requiere `npm run serve`.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 600, height: 600 } })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8080/'); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const out = {}; const rend = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }); rend.setSize(300, 300); rend.toneMapping = THREE.LinearToneMapping; rend.toneMappingExposure = 0.004; document.body.append(rend.domElement);
    const t = await new Promise(res => new THREE.RGBELoader().setDataType(THREE.FloatType).load('hdri/dia.hdr', res)); t.mapping = THREE.EquirectangularReflectionMapping;
    const d = t.image.data, w = t.image.width; let mx = -1, mi = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; if (l > mx) { mx = l; mi = i / 4; } } const azH = ((mi % w) / w - 0.5) * 2 * Math.PI; out.azH = azH;
    const pm = new THREE.PMREMGenerator(rend), env = pm.fromEquirectangular(t).texture;
    const sc = new THREE.Scene(); sc.environment = env; const esf = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.02, color: 0xffffff })); sc.add(esf);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 6); cam.lookAt(0, 0, 0);
    const s = new THREE.Vector3(1, 0.3, 0.2).normalize(), azW = Math.atan2(s.z, s.x); out.azW = azW;
    const h = new THREE.Vector3(0, 0, 1).add(s).normalize();   // normal donde se ve el reflejo del sol
    const pos = (th) => { sc.environmentRotation.y = th; rend.render(sc, cam); const gl = rend.getContext(), px = new Float32Array(4), u8 = new Uint8Array(300 * 300 * 4); gl.readPixels(0, 0, 300, 300, gl.RGBA, gl.UNSIGNED_BYTE, u8); let m = -1, mxp = 0, myp = 0; for (let y = 0; y < 300; y++) for (let x = 0; x < 300; x++) { const i = (y * 300 + x) * 4, l = u8[i] + u8[i + 1] + u8[i + 2]; if (l > m) { m = l; mxp = x; myp = y; } } const R = 150 / Math.tan(15 * Math.PI / 180) / 6 * 1, nx = (mxp - 150) / R, ny = (myp - 150) / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), k = 2 * nz; return { px: [mxp, myp], azRef: +Math.atan2(k * nz - 1, k * nx).toFixed(3), elRef: +Math.asin(Math.max(-1, Math.min(1, k * ny))).toFixed(3) }; };
    // posición esperada en pantalla de la normal h sobre una esfera de radio 1 a distancia 6 (proyección aproximada)
    const proy = n => { const v = new THREE.Vector3(n.x, n.y, n.z).multiplyScalar(1); v.add(new THREE.Vector3(0, 0, 0)); const q = v.clone().project(cam); return [(q.x * 0.5 + 0.5) * 300, (q.y * 0.5 + 0.5) * 300]; };
    out.esperado = proy(h); out.formulaAntigua_az_menos_h = pos(azW - azH); out.formulaActual_h_menos_az = pos(azH - azW); out.sinRotar = pos(0); return out;
  });
  console.log(JSON.stringify(r)); await b.close();
})();
