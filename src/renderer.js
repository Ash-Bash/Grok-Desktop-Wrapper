console.log('Renderer script running');

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (typeof window.electronAPI?.showContextMenu === 'function') {
    window.electronAPI.showContextMenu();
  } else {
    console.error('showContextMenu is not available on electronAPI');
  }
});