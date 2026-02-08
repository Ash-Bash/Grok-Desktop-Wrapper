const { app, session, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, shell, nativeTheme, Notification } = require('electron');
const windowStateKeeper = require('electron-window-state');
const path = require('path');

let mainWindow;

// Set userData path to a subfolder to avoid conflicts with any other Electron apps
app.setPath('userData', path.join(app.getPath('userData'), 'GrokDesktop'));

// Detect dev mode (VSCode / dev run)
const isDev =
  !app.isPackaged ||
  process.env.NODE_ENV === 'development' ||
  process.execArgv.some(arg => arg.includes('--inspect')) ||
  process.env.VSCODE_INSPECTOR_OPTIONS;

function createWindow() {
  // Define your preferred defaults
  const defaultWidth = 800;
  const defaultHeight = 1000;

  // Create state manager with defaults (x/y will be undefined → Electron centers)
  const mainWindowState = windowStateKeeper({
    defaultWidth,
    defaultHeight,
    // You can also set path or file name if you want multiple windows/states
    // path: app.getPath('userData'),
    // file: 'grok-window-state.json',
  });

  // Get primary work area (for fallback centering calculation if needed)
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // Calculate fallback centered position (only used if state.x/y are undefined)
  const fallbackX = Math.floor((screenWidth - defaultWidth) / 2);
  const fallbackY = Math.floor((screenHeight - defaultHeight));

  mainWindow = new BrowserWindow({
    x: mainWindowState.x !== undefined ? mainWindowState.x : fallbackX,
    y: mainWindowState.y !== undefined ? mainWindowState.y : fallbackY,
    width: mainWindowState.width,
    height: mainWindowState.height,
    title: "Grok Desktop",
    icon: path.join(__dirname, '../assets/GrokDesktop_DS_Icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    titleBarOverlay: process.platform === 'darwin' ? {
      color: '#1a1a1a',           // Match your Grok background (or make '#00000000' for more transparent)
      symbolColor: '#ffffff',     // White close/minimize/zoom icons for dark mode
      height: 38                  // Adjust based on your needs (default inset is ~38px)
    } : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: true
    }
  });

  // Let the library manage/remember bounds, maximized state, etc.
  mainWindowState.manage(mainWindow);

  // Load Grok
  mainWindow.loadURL("https://grok.com/");

  mainWindow.once('ready-to-show', () => {
    // Restore maximized state if it was saved that way
    if (mainWindowState.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  const wc = mainWindow.webContents;

  wc.on('did-finish-load', () => {
    if (process.platform === 'darwin') {
      wc.insertCSS(`
      .custom-title-bar, .phy-title-bar {
        display: flex;
        height: 38px;
        background-color: #0f0f0f;       /* Grok dark background – adjust if needed */
        color: #ffffff;
        align-items: center;
        justify-content: center;         /* Centers children horizontally */
        padding: 0 16px;
        -webkit-app-region: drag;
        z-index: 9999;
        user-select: none;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .custom-title-bar { 
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
      }

      /* Still prevent drag on future interactive elements if you add any */
      .custom-title-bar button,
      .custom-title-bar .window-controls {
        -webkit-app-region: no-drag;
      }
    `).catch(err => console.error('Title bar CSS failed:', err));

    // Optional: Add the bar element if Grok doesn't have a header to repurpose
    wc.executeJavaScript(`
      if (!document.querySelector('.custom-title-bar')) {
        const bar = document.createElement('div');
        bar.className = 'custom-title-bar';

        bar.innerHTML = \`
          <div style="flex: 1; text-align: center; font-weight: 600;">
            Grok Desktop
          </div>
        \`;

        document.body.prepend(bar);
      }
    `);

    // Optional: Add the bar element if Grok doesn't have a header to repurpose
    wc.executeJavaScript(`
      if (!document.querySelector('.phy-title-bar')) {
        const bar = document.createElement('div');
        bar.className = 'phy-title-bar';

        document.body.prepend(bar);
      }
    `);
    }
});

  // Force window title
  wc.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('Grok Desktop');
  });

  // Ensure Electron receives right-click events (Grok intercepts them)
  wc.on('dom-ready', () => {
    console.log("Ready To DOMinate!");

    wc.executeJavaScript(`
      document.addEventListener('contextmenu', e => {
        e.stopImmediatePropagation();
      }, true);
    `);

    if (process.platform === 'darwin') {
      wc.insertCSS(`
          body {
            overflow: hidden;
          }

          div.h-full:not(div.flex.flex-col.justify-between.h-full) {
            height: calc(100% - 38px) !important;
          }

          div.w-full.relative div.absolute.left-0.bottom-0.w-full.p-3 {
            margin-bottom: 38px !important; /* Move compose button up to avoid title bar */
          }

          button.inline-flex.items-center.justify-center div, div.relative.w-full div.flex.w-full.h-full.border.border-border-l2.rounded-full.overflow-hidden.items-center.bg-surface-l1 {
            padding-bottom: 0px !important;
            margin-bottom: 0px !important;
            height: 100% !important;
          }

          div.flex.w-full.h-full.border.border-border-l2.overflow-hidden.items-center.bg-surface-l1.rounded-3xl {
            height: auto !important;
          }

          div.h-fit.w-full.pb-5 {
            margin-bottom: 38px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          div.absolute.bottom-0.mx-auto.inset-x-0.max-w-breakout{
            bottom: 38px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
      `);
    }
  });

  // Notification permission request (for Grok's web notifications)
  wc.executeJavaScript(`
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  `);

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

    /* ======================
       Grok Reload
    ====================== */
    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({ 
      role: 'reload', 
      accelerator: 'CmdOrCtrl+R',
      click: () => wc.reload() 
    });

    if (menuTemplate.length > 0) {
      Menu.buildFromTemplate(menuTemplate).popup({ window: mainWindow });
    }
  });

  /*// Handle external links - open them in the default browser instead of within the app
  wc.setWindowOpenHandler(({ url }) => {
    // Check if the URL is external (not part of grok.com domain)
    if (url && !url.startsWith('https://grok.com') && !url.startsWith('https://x.com/i/grok')) {
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent opening in the app
    }
    return { action: 'allow' }; // Allow grok.com links to open within the app
  });

  // Handle navigation attempts to external URLs
  wc.on('will-navigate', (event, navigationUrl) => {
    // Allow navigation within grok.com and x.com/i/grok
    if (navigationUrl.startsWith('https://grok.com') || 
        navigationUrl.startsWith('https://x.com/i/grok') ||
        navigationUrl.startsWith('https://x.com/login')) {
      return; // Allow the navigation
    }
    
    // For all other URLs, prevent navigation and open in external browser
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });*/

  // Intercept new window / popups (e.g. window.open() from Grok Imagine "Compose Post")
  wc.setWindowOpenHandler(({ url }) => {
    // Define patterns that should open externally
    const externalPatterns = [
      'https://x.com/compose/post',       // Main compose URL
      'https://x.com/intent/compose',     // Older/alternative compose
      'https://twitter.com/compose/post', // Legacy twitter.com redirect
      'https://twitter.com/intent/compose'
    ];

    const isExternalCompose = externalPatterns.some(pattern => url.startsWith(pattern));
    const isNotGrokDomain = !url.startsWith('https://grok.com') && 
                            !url.startsWith('https://x.com/i/grok') &&
                            !url.startsWith('https://x.com/login');

    if (isExternalCompose || isNotGrokDomain) {
      // Open in default system browser
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent opening inside the app
    }

    // Allow internal Grok/X navigation to stay in the window
    return { action: 'allow' };
  });

  // Also catch direct navigation attempts (e.g. <a href> or programmatic navigation)
  wc.on('will-navigate', (event, navigationUrl) => {
    const externalPatterns = [
      'https://x.com/compose/post',
      'https://x.com/intent/compose',
      'https://twitter.com/compose/post',
      'https://twitter.com/intent/compose'
    ];

    const isExternalCompose = externalPatterns.some(pattern => navigationUrl.startsWith(pattern));
    const isNotGrokDomain = !navigationUrl.startsWith('https://grok.com') && 
                            !navigationUrl.startsWith('https://x.com/i/grok') &&
                            !navigationUrl.startsWith('https://x.com/login');

    if (isExternalCompose || isNotGrokDomain) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
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

  /*let tray = new Tray(path.join(__dirname, '../assets/GrokDesktop_DS_Icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Grok', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Grok Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());*/
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
