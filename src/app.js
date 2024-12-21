const { app, BrowserWindow } = require('electron');
const path = require('path');
const { screen } = require('electron');

function createWindow () {

  const { width, height } = screen.getPrimaryDisplay().workAreaSize; // workAreaSize excludes the taskbar

  const windowWidth = 800; // Example width of your window
  const windowHeight = 1000; // Example height of your window

  // Calculate the X position for horizontal center
  const x = (width - windowWidth) / 2;

  // Calculate the Y position for just above the taskbar
  const y = height - windowHeight;

  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    title: "Grok Desktop",
    icon: path.join(__dirname, '../assets/GrokDesktop_DS_Icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      plugins: true,
      sandbox: false
    }
  });

  // Loads Grok Homepage
  mainWindow.loadURL("https://x.com/i/grok");

  let wc = mainWindow.webContents

  wc.on('did-finish-load', () => {
  });

  wc.on("dom-ready", function () {
    console.log("Ready To DOMinate!");
    // insert CSS Code into Grok to hide and modifiy certain elements to look better for app wrapper
    wc.insertCSS(`
        header.css-175oi2r.r-lrvibr.r-1g40b8q.r-obd0qt.r-16y2uox, 
        button.css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-10v3vxq.r-2yi16.r-1qi8awa.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l,
        button.css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-10v3vxq.r-15ysp7h.r-4wgw6l.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l {
          display: none !important;
        }
        main.css-175oi2r.r-150rngu.r-16y2uox.r-1wbh5a2.r-rthrr5, 
        div.css-175oi2r.r-150rngu.r-16y2uox.r-1wbh5a2.r-113js5t, 
        div.css-175oi2r.r-150rngu.r-16y2uox.r-1wbh5a2.r-33ulu8, 
        div.css-175oi2r.r-150rngu.r-16y2uox.r-1wbh5a2.r-rthrr5,
        div.css-175oi2r.r-150rngu.r-16y2uox.r-1wbh5a2.r-1obr2lp {
          width: 100% !important;
        }
    `);
    
    // Inserts CSS Code to modifiy Grok to work better for app wrapper
    wc.executeJavaScript(`
        
    `)
  });
  
  wc.on('page-title-updated', (event, title) => {
    event.preventDefault()
    mainWindow.setTitle('Grok Desktop') // or dynamically set based on some logic
  })
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// IPC handler for any communication from renderer to main
app.on('from-renderer', (event, arg) => {
    console.log('Received from renderer:', arg);
});