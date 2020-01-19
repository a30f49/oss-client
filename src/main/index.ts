import {app, BrowserWindow} from 'electron';
import './bootstrap';

declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: Electron.BrowserWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    height: 600,
    // FIXME: 渲染进程不使用 node
    webPreferences: {nodeIntegration: true},
    width: 800,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).then(() => {
    console.log('加载页面成功~');
  });

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});