import { app, BrowserWindow, nativeImage } from "electron";
import path from "path";
import { existsSync } from "fs";
import process from "process";
const iconBaseDir: string = path.join(__dirname, "./renderer/designSource"); 
const preloadScript: string = path.join(__dirname, "preload.js");
const targetUrl: string = "https://abstractcloud-press.com/path/home?pwadisable=true";
const localPort: string = "https://localhost:8000";
const devUrl: string = localPort + "/path/home";
const devServerUrl: URL = new URL(localPort);
const indexPath: string = path.join(__dirname, "./renderer/index.html");
const iconBaseName: string = "icon";
let iconPath: string | undefined;
let mainWindow: BrowserWindow | null;
let createWindow: () => void;

mainWindow = null;

switch (process.platform) {
  case "win32":
    iconPath = path.join(iconBaseDir, `${iconBaseName}.ico`);
    break;
  case "darwin":
    iconPath = path.join(iconBaseDir, `${iconBaseName}.icns`);
    break;
  default:
    iconPath = path.join(iconBaseDir, `${iconBaseName}.png`);
    break;
}

createWindow = () => {
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
      preload: preloadScript,
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#ffffff", // 제목 표시줄 배경색 (하얀색)
      symbolColor: "#000000" // 아이콘 색상 (검은색)
    },
    trafficLightPosition: { x: 15, y: 10 } // macOS 신호등 버튼 위치 조정
  });

  if (mainWindow !== null) {
    mainWindow.maximize();
    if (process.env.NODE_ENV === "development") {
      setTimeout(() => {
        if (mainWindow !== null) {
          mainWindow!.loadURL(devUrl);
          mainWindow!.webContents.openDevTools();
        }
      }, 0);
    } else {
      setTimeout(() => {
        if (mainWindow !== null) {
          mainWindow!.loadURL(targetUrl).catch((err) => {
            if (existsSync(indexPath)) {
              mainWindow!.loadFile(indexPath).catch((e) => console.log(e));
            } else {
              console.log("index.html not found:", indexPath);
            }
          });
        }
      }, 0);
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

if (process.env.NODE_ENV === "development") {
  app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
    const requestUrl = new URL(url);
    if (requestUrl.hostname === devServerUrl.hostname && requestUrl.port === devServerUrl.port) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
}