// Hojas de contacto numeradas de las fotos de referencia (recursos/referencias/<tema>/NN.jpg -> recursos/referencias/_hojas/<tema>.png)
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const url = f => 'file:///' + f.split(path.sep).join('/');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const base = path.join(__dirname, '..', 'recursos', 'referencias');
  fs.mkdirSync(path.join(base, '_hojas'), { recursive: true });
  for (const t of fs.readdirSync(base).filter(n => n !== '_hojas')) {
    const lista = fs
      .readdirSync(path.join(base, t))
      .filter(f => /jpg$/.test(f))
      .sort();
    const html =
      '<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(5,1fr);gap:4px">' +
      lista
        .map(
          f =>
            '<div style="position:relative"><img src="' +
            url(path.join(base, t, f)) +
            '" style="width:100%;height:320px;object-fit:cover"><b style="position:absolute;left:6px;top:4px;color:#fff;background:#000a;font:bold 26px sans-serif;padding:0 8px">' +
            f.slice(0, 2) +
            '</b></div>'
        )
        .join('') +
      '</body>';
    const h = path.join(base, '_hojas', t + '.html');
    fs.writeFileSync(h, html);
    await p.goto(url(h));
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(base, '_hojas', t + '.png'), fullPage: true });
    console.log(t, lista.length);
  }
  await b.close();
})();
