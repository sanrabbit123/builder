import { app, session, BrowserWindow, nativeImage, ipcMain, Notification } from "electron";
import path from "path";
import { existsSync } from "fs";
import process from "process";
import { Mother } from "./mother.js";

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

// icon path setting
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

// main window setting
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
    frame: false,
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

// node.js events
app.whenReady().then(() => {

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' https://abstractcloud-press.com;",
          "script-src 'self' 'unsafe-inline' https://*.google-analytics.com https://*.naver.net;",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: https:;",
          "font-src 'self' data:;",
          "connect-src 'self' https://*.google-analytics.com https://*.naver.net https://abstractcloud-press.com;",
        ].join(" "),
      },
    });
  });

  createWindow();

  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window-close", () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.on("window-minimize", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("show-notification", async (event, title: string, body: string, json: string, route: string) => {

    if (!Notification.isSupported()) {
      const thisJson = JSON.parse(json);
      await Mother.requestSystem(route, thisJson, { headers: { "Content-Type": "application/json" } });
    } else {

      const icon = nativeImage.createFromPath(iconPath!);
      const notification = new Notification({
        title: title,
        body: body,
        icon: icon,
        silent: true,
      });

      notification.on("click", () => {
        if (mainWindow) {
          mainWindow.show();
        }
      });

      notification.show();
    }
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// etc events
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// dev cert
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