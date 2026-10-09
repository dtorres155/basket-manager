// Basket Manager 26/27 para ordenador (Electron). Abre el juego (la carpeta app/, copia de dist/ más los recursos pesados) en una
// ventana propia, servido con el protocolo interno app:// para que los modelos y texturas se carguen desde disco.
// F11: pantalla completa. Ctrl+R: recargar. F12: herramientas de desarrollo (solo si se arranca con --depurar).
const { app, BrowserWindow, protocol, net, Menu, shell, dialog } = require('electron');
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
    icon: path.join(RAIZ, 'icons', 'icon-512.png'), webPreferences: { contextIsolation: true, sandbox: true, devTools: depurar, backgroundThrottling: false } });
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
