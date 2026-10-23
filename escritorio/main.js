// Basket Manager 26/27 para ordenador (Electron). Abre el juego (la carpeta app/, copia de dist/ más los recursos pesados) en una
// ventana propia, servido con el protocolo interno app:// para que los modelos y texturas se carguen desde disco.
// F11: pantalla completa. Ctrl+R: recargar. F12: herramientas de desarrollo (solo si se arranca con --depurar).
const { app, BrowserWindow, protocol, net, Menu, shell, dialog, ipcMain } = require('electron');
const fs = require('fs');
// Actualizaciones automáticas: al arrancar mira si hay una versión nueva publicada en GitHub (Releases), la descarga y pregunta si reiniciar.
let autoUpdater = null; try { ({ autoUpdater } = require('electron-updater')); } catch (e) { autoUpdater = null; }
function buscarActualizacion(v) {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', info => dialog.showMessageBox(v, { type: 'info', buttons: ['Reiniciar ahora', 'Más tarde'], defaultId: 0, cancelId: 1, title: 'Nueva versión', message: 'Hay una versión nueva del juego (' + info.version + ').', detail: 'Se instala al reiniciar. Tu partida se conserva.' }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); }));
  autoUpdater.on('error', () => {});
  autoUpdater.checkForUpdates().catch(() => {});
}
const path = require('path'), { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const RAIZ = path.join(__dirname, 'app'), depurar = process.argv.includes('--depurar');

function crearVentana() {
  const v = new BrowserWindow({ width: 1600, height: 900, minWidth: 1024, minHeight: 640, show: false, backgroundColor: '#0c1116', autoHideMenuBar: true, title: 'Basket Manager 26/27',
    icon: path.join(RAIZ, 'icons', 'icon-512.png'), webPreferences: { contextIsolation: true, sandbox: true, devTools: depurar, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') } });
  v.once('ready-to-show', () => { v.maximize(); v.show(); });
  v.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  v.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { v.setFullScreen(!v.isFullScreen()); e.preventDefault(); }
    else if (i.key === 'F12' && depurar) v.webContents.toggleDevTools();
    else if (i.control && i.key.toLowerCase() === 'r') { v.reload(); e.preventDefault(); }
  });
  v.loadURL('app://juego/index.html');
  v.webContents.once('did-finish-load', () => setTimeout(() => buscarActualizacion(v), 4000));
}

// Carpeta de trabajo compartida con el desarrollo: DocumentosBasketManager<apartado> (notas de prueba, informes de rendimiento, «¿Qué usas?», galería)
const APARTADOS = ['notas', 'rendimiento', 'usos', 'galeria'];
function rutaSegura(apartado, nombre) {
  if (!APARTADOS.includes(apartado)) throw new Error('apartado no permitido');
  const limpio = String(nombre || '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
  if (!limpio || limpio.startsWith('.')) throw new Error('nombre no válido');
  const dir = path.join(app.getPath('documents'), 'BasketManager', apartado);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, limpio);
}
ipcMain.handle('bm:guardar', (e, apartado, nombre, datos, binario) => {
  const f = rutaSegura(apartado, nombre);
  fs.writeFileSync(f, binario ? Buffer.from(String(datos), 'base64') : String(datos), binario ? undefined : 'utf8');
  return f;
});
ipcMain.handle('bm:captura', async (e, apartado, nombre) => {
  const f = rutaSegura(apartado, nombre), img = await e.sender.capturePage();
  fs.writeFileSync(f, img.toPNG());
  return f;
});
ipcMain.handle('bm:carpeta', () => path.join(app.getPath('documents'), 'BasketManager'));
ipcMain.handle('bm:abrirCarpeta', (e, apartado) => {
  const d = path.join(app.getPath('documents'), 'BasketManager', APARTADOS.includes(apartado) ? apartado : '');
  fs.mkdirSync(d, { recursive: true });
  return shell.openPath(d);
});
ipcMain.handle('bm:version', () => app.getVersion());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // app://juego/<ruta> -> archivo dentro de app/ (sin salir de la carpeta)
  protocol.handle('app', req => {
    const u = new URL(req.url), rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html', abs = path.normalize(path.join(RAIZ, rel));
    if (!abs.startsWith(RAIZ)) return new Response('No permitido', { status: 403 });
    return net.fetch(pathToFileURL(abs).toString());
  });
  crearVentana();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) crearVentana(); });
});
app.on('window-all-closed', () => app.quit());
