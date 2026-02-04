console.log('Renderer script running');

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (typeof window.electronAPI?.showContextMenu === 'function') {
    const selection = window.getSelection().toString();

    window.electronAPI.showContextMenu({
      selectionText: selection
    });
  } else {
    console.error('showContextMenu is not available on electronAPI');
  }
});