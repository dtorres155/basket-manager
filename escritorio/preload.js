// Puente seguro entre el juego y el disco (solo en la versión de escritorio). El juego lo ve como window.escritorio.
// Guarda informes, notas de prueba y capturas en Documentos\BasketManager\<apartado>\ para que se puedan leer después.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('escritorio', {
  // apartado: notas, rendimiento, usos o galeria; nombre: archivo sin carpetas; datos: texto, o PNG en base64 si binario es true
  guardar: (apartado, nombre, datos, binario) => ipcRenderer.invoke('bm:guardar', apartado, nombre, datos, !!binario),
  // captura de la ventana entera (mundo 3D e interfaz) guardada como PNG en ese apartado
  captura: (apartado, nombre) => ipcRenderer.invoke('bm:captura', apartado, nombre),
  carpeta: () => ipcRenderer.invoke('bm:carpeta'),
  abrirCarpeta: apartado => ipcRenderer.invoke('bm:abrirCarpeta', apartado),
  version: () => ipcRenderer.invoke('bm:version')
});
