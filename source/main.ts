import { app, session, BrowserWindow, nativeImage, ipcMain, Notification, MessageChannelMain, MessageEvent, MessagePortMain, IpcMainInvokeEvent, IpcRendererEvent, IpcMainEvent } from "electron";
import { App } from "electron/main";
import path from "path";
import { existsSync } from "fs";
import fsPromise from "fs/promises";
import process from "process";
import { Mother } from "./apps/mother.js";
import { RouterFunction, RouterObject, RouterUnit } from "./apps/classStorage/dictionary.js";
import { TurtleRouter } from "./apps/turtleRouter/turtleRouter.js";
import log from "electron-log";

log.transports.file.resolvePathFn = () => path.join(app.getPath("logs"), "main.log");
log.initialize();
Object.assign(console, log.functions);

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
  public router: TurtleRouter | null;

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
    this.router = null;
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

  public createWindow = (): BrowserWindow => {
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

    return this.mainWindow;
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
    this.router = router;
  }

  public setAppEvents = () => {
    const instance = this;

    this.mainApp.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        instance.mainWindow = instance.createWindow();
        if (instance.router !== null) {
          instance.router.setMainWindow(instance.mainWindow);
        }
      }
    });

    this.mainApp.on("window-all-closed", () => {
      instance.mainApp.quit();
    });
    
    if (process.env.NODE_ENV === "development") {
      this.mainApp.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
        const requestUrl = new URL(url);
        event.preventDefault();
        callback(true);
        // if (requestUrl.hostname === instance.devServerUrl.hostname && requestUrl.port === instance.devServerUrl.port) {
        //   event.preventDefault();
        //   callback(true);
        // } else {
        //   callback(false);
        // }
      });
    }
  }

  public updateCspHeader = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      const cspHeaderKey = Object.keys(headers).find(k => k.toLowerCase() === "content-security-policy");
      if (cspHeaderKey) {
        headers[ cspHeaderKey ] = 
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://abstractcloud-press.com https://message.abstract-rabbit.xyz https://storage.abstract-rabbit.xyz data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://abstractcloud-press.com https://message.abstract-rabbit.xyz https://storage.abstract-rabbit.xyz https://wcs.naver.net https://www.googletagmanager.com https://ssl.pstatic.net https://*.google-analytics.com https://cs.l.naver.com https://connect.facebook.net data: blob:; connect-src *; img-src * data: blob:; style-src * 'unsafe-inline' data: blob:; font-src * data: blob:; media-src * data: blob:; base-uri 'self'; form-action 'self';frame-ancestors 'self';";
      }
      callback({ responseHeaders: headers });
    });
  }

  public logMotherProperties = () => {
    console.log(`isMac`, process.platform === "darwin");
    console.log(`isWindows`, /win32/gi.test(process.platform));
    console.log(`isDev`, !app.isPackaged);
    console.log(`appPath`, app.getAppPath());
    console.log(`resourcePath`, Mother.isDev ? app.getAppPath() : process.resourcesPath);
    console.log(`scriptPath`, path.join(app.getAppPath(), "dist"));
    console.log(`assetPath`, path.join(Mother.appPath, "./renderer"));
    console.log(`launcherPath`, path.join(Mother.resourcePath, "./launcher"));
    console.log(`programPath`, path.normalize(Mother.launcherPath));
    console.log(`javaProgram`, Mother.isDev ? path.join(Mother.launcherPath, "./jre/mac-arm64/bin/java") : path.join(Mother.launcherPath, "./jre/bin/java" + (!Mother.isWindows ? "" : ".exe")));
    console.log(`python3Program`, Mother.isDev ? path.join(Mother.launcherPath, "./python3/mac-arm64/bin/python3.13") : (Mother.isMac ? path.join(Mother.launcherPath, "./python3/bin/python3.13") : path.join(Mother.launcherPath, "./python.exe")));
    console.log(`pythonModulePath`, Mother.isDev ? path.join(Mother.launcherPath, "./python3/mac-arm64/lib/python3.13/site-packages/bin") : (Mother.isMac ? path.join(Mother.launcherPath, "./python3/lib/python3.13/site-packages/bin") : path.join(Mother.launcherPath, "./python313/site-packages/bin")));
    console.log(`pythonScriptPath`, path.join(Mother.resourcePath, "./launcher/py"));
    console.log(`browserPath`, Mother.isDev ? path.join(Mother.launcherPath, "./browser/mac-arm64/Chromium.app/Contents/MacOS/Chromium") : (Mother.isMac ? path.join(Mother.launcherPath, "./browser/Chromium.app/Contents/MacOS/Chromium") : path.join(Mother.launcherPath, "./chrome-win/chrome.exe")));
    console.log(`abstractTempFolderName`, "abstract_cloud_temp_folder");
    console.log(`tempFolder`, path.join(app.getPath("temp"), path.normalize(Mother.abstractTempFolderName + "/temp")));
    console.log(`staticFolder`, path.join(Mother.tempFolder, "static"));
    console.log(`logFolder`, path.join(Mother.tempFolder, "logs"));
    console.log(`homeFolder`, app.getPath("home"));
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
    this.updateCspHeader();
    this.createWindow();
    this.readyThenRouting();
    this.setAppEvents();
    this.logMotherProperties();
  }

}

const turtle: Turtle = new Turtle();
turtle.main().catch((err) => console.log(err));

export { Turtle };