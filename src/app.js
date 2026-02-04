const { app, session, BrowserWindow, globalShortcut, ipcMain, Menu, screen, shell } = require('electron');
const path = require('path');

let mainWindow;

// Detect dev mode (VSCode / dev run)
const isDev =
  !app.isPackaged ||
  process.env.NODE_ENV === 'development' ||
  process.execArgv.some(arg => arg.includes('--inspect')) ||
  process.env.VSCODE_INSPECTOR_OPTIONS;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 800;
  const windowHeight = 1000;

  const x = Math.floor((width - windowWidth) / 2);
  const y = Math.floor(height - windowHeight);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    title: "Grok Desktop",
    icon: path.join(__dirname, '../assets/GrokDesktop_DS_Icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: true
    }
  });

  // Load Grok
  mainWindow.loadURL("https://grok.com/");

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const wc = mainWindow.webContents;

  // Force window title
  wc.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('Grok Desktop');
  });

  // Ensure Electron receives right-click events (Grok intercepts them)
  wc.on('dom-ready', () => {
    wc.executeJavaScript(`
      document.addEventListener('contextmenu', e => {
        e.stopImmediatePropagation();
      }, true);
    `);
  });

  /* ======================================================
     NATIVE CONTEXT MENU (SPELLCHECK + EDIT + SEARCH + DEV)
  ====================================================== */
  wc.on('context-menu', (event, params) => {
    const menuTemplate = [];

    const hasSelection = !!params.selectionText;
    const isEditable = params.isEditable;
    const selectedText = params.selectionText || '';

    /* ======================
       SPELLCHECK / AUTOCORRECT
    ====================== */
    if (params.misspelledWord && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach(suggestion => {
        menuTemplate.push({
          label: suggestion,
          click: () => wc.replaceMisspelling(suggestion)
        });
      });

      menuTemplate.push({ type: 'separator' });

      menuTemplate.push({
        label: 'Add to Dictionary',
        click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      });

      menuTemplate.push({ type: 'separator' });
    }

    /* ======================
       EDIT ACTIONS (NATIVE)
    ====================== */
    if (isEditable) {
      menuTemplate.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      );
    } else if (hasSelection) {
      menuTemplate.push({ role: 'copy' });
    }

    /* ======================
       SEARCH GOOGLE
    ====================== */
    if (hasSelection) {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: 'Search with Google',
          click: () => shell.openExternal(
            'https://www.google.com/search?q=' + encodeURIComponent(selectedText)
          )
        }
      );
    }

    /* ======================
       LINKS
    ====================== */
    if (params.linkURL) {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: 'Open Link in Browser',
          click: () => shell.openExternal(params.linkURL)
        }
      );
    }

    /* ======================
       DEVTOOLS (DEV MODE ONLY)
    ====================== */
    if (isDev) {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => wc.toggleDevTools()
        }
      );
    }

    if (menuTemplate.length > 0) {
      Menu.buildFromTemplate(menuTemplate).popup({ window: mainWindow });
    }
  });

  // Shortcut: clear session + reload
  globalShortcut.register('CommandOrControl+Shift+L', async () => {
    await session.defaultSession.clearStorageData();
    mainWindow.loadURL("https://grok.com/");
  });
}

/* =========================
   APP LIFECYCLE
========================= */

app.whenReady().then(() => {

  // Spellcheck languages (UK + US English)
  session.defaultSession.setSpellCheckerLanguages(['en-GB', 'en-US']);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Native application menu (cross-platform)
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide', visible: process.platform === 'darwin' },
        { role: 'hideOthers', visible: process.platform === 'darwin' },
        { role: 'unhide', visible: process.platform === 'darwin' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { role: 'reload' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* =========================
   IPC
========================= */

ipcMain.on('clear-login-details', async () => {
  await session.defaultSession.clearStorageData();
  console.log("Login data cleared.");
});
