import { app, BrowserWindow, nativeImage, ipcMain, Notification } from "electron";
import { App } from "electron/main";
import path from "path";
import { existsSync } from "fs";
import process from "process";
import { Mother } from "./apps/mother.js";
import { fileURLToPath } from "url";

class Turtle {

  private protocol: string = "https:";
  private mainHost: string = "abstractcloud-press.com";
  private mainPath: string = "/path/home?pwadisable=true";
  private basePath: string = path.dirname(fileURLToPath(import.meta.url));
  private localPort: number = 8000;
  
  public iconBaseDir: string;
  public preloadScript: string;
  public targetUrl: string;
  public localTarget: string;
  public devUrl: string;
  public devServerUrl: URL;
  public indexPath: string;
  public iconBaseName: string;
  public mainApp: App;
  public iconPath: string;
  public mainWindow: BrowserWindow | null;

  constructor () {
    this.iconBaseDir = path.join(this.basePath, "./renderer/designSource"); 
    this.preloadScript = path.join(this.basePath, "preload.js");
    this.targetUrl = this.protocol + "//" + this.mainHost + this.mainPath;
    this.localTarget = this.protocol + "//" + "localhost:" + String(this.localPort);
    this.devUrl = this.localTarget + this.mainPath;
    this.devServerUrl = new URL(this.localTarget);
    this.indexPath = path.join(this.basePath, "./renderer/index.html");
    this.iconBaseName = "icon";
    this.iconPath = "";
    this.mainWindow = null;
    this.mainApp = app;
  }

  public setIconPath = () => {
    switch (process.platform) {
      case "win32":
        this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.ico`);
        break;
      case "darwin":
        this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.icns`);
        break;
      default:
        this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.png`);
        break;
    }
  }

  public createWindow = () => {
    if (this.iconPath && existsSync(this.iconPath)) {
      const iconImage = nativeImage.createFromPath(this.iconPath);
      if (this.mainApp.dock) {
        this.mainApp.dock.setIcon(iconImage);
      }
    }

    this.mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      icon: this.iconPath,
      webPreferences: {
        preload: this.preloadScript,
        contextIsolation: true,
        nodeIntegration: false,
      },
      frame: false,
    });

    if (this.mainWindow !== null) {
      this.mainWindow.maximize();
      if (process.env.NODE_ENV === "development") {
        setTimeout(() => {
          if (this.mainWindow !== null) {
            this.mainWindow!.loadURL(this.devUrl);
            this.mainWindow!.webContents.openDevTools();
          }
        }, 0);
      } else {
        setTimeout(() => {
          if (this.mainWindow !== null) {
            this.mainWindow!.loadURL(this.targetUrl).catch((err) => {
              if (existsSync(this.indexPath)) {
                this.mainWindow!.loadFile(this.indexPath).catch((e) => console.log(e));
              } else {
                console.log("index.html not found:", this.indexPath);
              }
            });
          }
        }, 0);
      }

      this.mainWindow.on("closed", () => {
        this.mainWindow = null;
      });
    }
  }

  public readyThenRouting = () => {
    const instance = this;

    this.createWindow();

    ipcMain.on("window-maximize", () => {
      if (instance.mainWindow) {
        if (instance.mainWindow.isMaximized()) {
          instance.mainWindow.unmaximize();
        } else {
          instance.mainWindow.maximize();
        }
      }
    });

    ipcMain.on("window-close", () => {
      if (instance.mainWindow) {
        instance.mainWindow.close();
      }
    });

    ipcMain.on("window-minimize", () => {
      if (instance.mainWindow) {
        instance.mainWindow.minimize();
      }
    });

    ipcMain.on("show-notification", async (event, title: string, body: string, json: string, route: string) => {

      if (!Notification.isSupported()) {
        const thisJson = JSON.parse(json);
        await Mother.requestSystem(route, thisJson, { headers: { "Content-Type": "application/json" } });
      } else {

        const icon = nativeImage.createFromPath(instance.iconPath!);
        const notification = new Notification({
          title: title,
          body: body,
          icon: icon,
          silent: true,
        });

        notification.on("click", () => {
          if (instance.mainWindow) {
            instance.mainWindow.show();
          }
        });

        notification.show();
      }
    });

  }

  public setAppEvents = () => {
    const instance = this;

    this.mainApp.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        instance.createWindow();
      }
    });

    this.mainApp.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        instance.mainApp.quit();
      }
    });

    if (process.env.NODE_ENV === "development") {
      this.mainApp.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
        const requestUrl = new URL(url);
        if (requestUrl.hostname === instance.devServerUrl.hostname && requestUrl.port === instance.devServerUrl.port) {
          event.preventDefault();
          callback(true);
        } else {
          callback(false);
        }
      });
    }
  }

  public main = async () => {
    this.mainApp.commandLine.appendSwitch("force-gpu-rasterization");
    this.mainApp.commandLine.appendSwitch("ignore-gpu-blocklist");
    this.setIconPath();

    await this.mainApp.whenReady();
    this.readyThenRouting();
    this.setAppEvents();
  }

}

const turtle: Turtle = new Turtle();
turtle.main().catch((err) => console.log(err));

export { Turtle };