const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');
const { exec } = require('child_process'); // <-- eksik olan bu

let backendProcess;

function createWindow() {
 Menu.setApplicationMenu(null);
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'frontend', 'build', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    
    

    win.webContents.openDevTools(); 
}

// Electron uygulaması hazır olduğunda
app.whenReady().then(() => {
    // Backend server.js çalıştır
    backendProcess = exec('node server.js', {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit'
    });

    // Pencereyi oluştur
    createWindow();
});

// macOS dışı sistemlerde tüm pencereler kapanınca uygulamadan çık
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Uygulama kapanmadan önce backend server'ı durdur
app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
