import { app, BrowserWindow, nativeImage, ipcMain, Notification, MessageChannelMain, MessageEvent, MessagePortMain, IpcMainInvokeEvent, IpcRendererEvent, IpcMainEvent } from "electron";
import { App } from "electron/main";
import path from "path";
import { existsSync } from "fs";
import fsPromise from "fs/promises";
import process from "process";
import { Mother } from "./apps/mother.js";
import { RouterFunction, RouterObject, RouterUnit } from "./apps/classStorage/dictionary.js";
import { TurtleRouter } from "./apps/turtleRouter/turtleRouter.js";

class Turtle {

  private protocol: string = "https:";
  private mainHost: string = "abstractcloud-press.com";
  private mainPath: string = "/path/home?pwadisable=true";
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
  public tempFolder: string;
  public staticFolder: string;
  public logFolder: string;
  public homeFolder: string;
  public abstractTempFolderName: string;

  constructor () {
    this.iconBaseDir = path.join(Mother.assetPath, "./designSource"); 
    this.preloadScript = path.join(Mother.scriptPath, "./preload.js");
    this.targetUrl = this.protocol + "//" + this.mainHost + this.mainPath;
    this.localTarget = this.protocol + "//" + "localhost:" + String(this.localPort);
    this.devUrl = this.localTarget + this.mainPath;
    this.devServerUrl = new URL(this.localTarget);
    this.indexPath = path.join(Mother.assetPath, "./index.html");
    this.iconBaseName = "icon";
    this.iconPath = "";
    this.mainWindow = null;
    this.mainApp = app;
    this.abstractTempFolderName = Mother.abstractTempFolderName;
    this.tempFolder = Mother.tempFolder;
    this.staticFolder = Mother.staticFolder;
    this.logFolder = Mother.logFolder;
    this.homeFolder = Mother.homeFolder;
  }

  public setIconPath = () => {
    switch (process.platform) {
      case "win32":
        this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.ico`);
        break;
      case "darwin":
        this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.icns`);
        if (process.env.NODE_ENV === "development") {
          this.iconPath = path.join(this.iconBaseDir, `${ this.iconBaseName }.png`);
        }
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
    const router = new TurtleRouter(instance.mainWindow!, instance.iconPath);
    const routerObject: RouterObject = router.getAll();
    for (let unit of routerObject.handle) {
      ipcMain.handle(unit.link, unit.func);
    }
    for (let unit of routerObject.on) {
      ipcMain.on(unit.link, unit.func);
    }
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
    const tempFolder: string = this.mainApp.getPath("temp");
    await fsPromise.mkdir(path.join(tempFolder, this.abstractTempFolderName), { recursive: true });
    await fsPromise.mkdir(this.tempFolder, { recursive: true });
    await fsPromise.mkdir(this.staticFolder, { recursive: true });
    await fsPromise.mkdir(this.logFolder, { recursive: true });
    this.mainApp.commandLine.appendSwitch("force-gpu-rasterization");
    this.mainApp.commandLine.appendSwitch("ignore-gpu-blocklist");
    this.setIconPath();
    await this.mainApp.whenReady();
    this.createWindow();
    this.readyThenRouting();
    this.setAppEvents();
  }

}

const turtle: Turtle = new Turtle();
turtle.main().catch((err) => console.log(err));

export { Turtle };