const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');

if (!window.electronAPI) {
    contextBridge.exposeInMainWorld('electronAPI', {
      //showContextMenu: () => ipcRenderer.send('show-context-menu'),
      clearLogin: () => ipcRenderer.send('clear-login-details'),
      version: process.versions.electron
    });
} else {
    console.warn('electronAPI already exists on window, skipping redefinition');
}

window.addEventListener('DOMContentLoaded', () => {
  const rendererPath = path.join(__dirname, 'renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  
  const script = document.createElement('script');
  script.textContent = rendererCode;
  document.head.appendChild(script);
});

// Expose Electron APIs to renderer.js
contextBridge.exposeInMainWorld('electronAPI', {
  getRemote: () => require('electron').remote,
});

console.log('Preload script loaded successfully!');