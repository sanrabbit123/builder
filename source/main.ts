import { app, BrowserWindow, nativeImage, ipcMain } from "electron";
import path from "path";
import { existsSync } from "fs";
import process from "process";
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import logger from 'electron-log';

autoUpdater.logger = logger;
(autoUpdater.logger as any).transports.file.level = 'info';
logger.info('App starting...');

const iconBaseDir = path.join(__dirname, "./renderer/designSource"); 
const iconBaseName = "icon";
let iconPath: string | undefined;

switch (process.platform) {
  case "win32":
    iconPath = path.join(iconBaseDir, `${iconBaseName}.ico`);
    logger.info("Detected Windows, using .ico");
    break;
  case "darwin":
    iconPath = path.join(iconBaseDir, `${iconBaseName}.icns`);
    logger.info("Detected macOS, using .icns");
    break;
  default:
    iconPath = path.join(iconBaseDir, `${iconBaseName}.png`);
    logger.info(`Detected ${process.platform}, using .png`);
    break;
}

if (process.env.NODE_ENV === "development") {
  app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
    const devServerUrl = new URL("https://localhost:8000");
    const requestUrl = new URL(url);
    if (requestUrl.hostname === devServerUrl.hostname && requestUrl.port === devServerUrl.port) {
      logger.info(`Allowing certificate error for ${url}`);
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
}

let mainWindow: BrowserWindow | null = null;

// === 신규: 렌더러에 상태/정보 전달 함수 ===
const sendToRenderer = (channel: string, ...args: any[]) => {
  logger.info(`Sending message to renderer [${channel}]:`, args);
  mainWindow?.webContents.send(channel, ...args);
}

// === 기존 코드 수정: createWindow 함수 ===
const createWindow = () => {
  if (iconPath && existsSync(iconPath)) {
    const iconImage = nativeImage.createFromPath(iconPath);
    if (app.dock) {
      app.dock.setIcon(iconImage);
    }
  } else {
    iconPath = undefined;
  }

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize();

  if (process.env.NODE_ENV === "development") {
    const devUrl = "https://localhost:8000/path/home";
    logger.info(`Loading development URL: ${devUrl}`);
    setTimeout(() => {
      mainWindow?.loadURL(devUrl);
      mainWindow?.webContents.openDevTools();
    }, 0);
  } else {
    const indexPath = path.join(__dirname, "./renderer/index.html");
    if (existsSync(indexPath)) {
      mainWindow?.loadFile(indexPath);
    } else {
      logger.error("Production index.html not found:", indexPath);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  setTimeout(() => {
    logger.info('Initiating update check...');
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // === 신규: 렌더러로부터 업데이트 설치 명령 수신 ===
  ipcMain.on('install-update-request', () => {
    logger.info('Install update request received. Quitting and installing...');
    autoUpdater.quitAndInstall();
  });

  // === 기존 코드: activate 이벤트 핸들러 ===
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('App activated, creating window.');
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.info('All windows closed, quitting app.');
    app.quit();
  } else {
    logger.info('All windows closed on darwin, app remains active.');
  }
});

// === 신규: autoUpdater 이벤트 핸들러 ===
autoUpdater.on('checking-for-update', () => {
  sendToRenderer('update-status', '업데이트 서버 확인 중...');
});

autoUpdater.on('update-available', (info: UpdateInfo) => {
  sendToRenderer('update-status', `새 버전(${info.version}) 발견! 다운로드를 시작합니다.`);
});

autoUpdater.on('update-not-available', (info: UpdateInfo) => {
  sendToRenderer('update-status', `현재 최신 버전(${info.version})입니다.`);
});

autoUpdater.on('error', (error: Error) => {
  logger.error('Update Error:', error);
  sendToRenderer('update-error', `업데이트 중 오류 발생: ${error.message}`);
});

autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
  sendToRenderer('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
  logger.info(`Update downloaded. Version: ${info.version}`);
  sendToRenderer('update-ready', info);
});