import { nativeImage, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent, MessagePortMain, MessageEvent, Notification } from "electron";
import { Mother } from "../mother.js";
import { EpubMaker } from "../epubMaker/epubMaker.js";
import { Dictionary, RouterFunction, RouterUnit, RouterObject, BlobBuffer, ChannelFunction, ChannelUnit, ElectronSocketSend, UnknownFunction, SocketUnit, SocketFunction, FlatDeath, FlatDeathObject } from "../classStorage/dictionary.js";
import path from "path";

class TurtleRouter {

  public iconPath: string;
  public mainWindow: BrowserWindow;
  public epub: EpubMaker;

  constructor (mainWindow: BrowserWindow, iconPath: string) {
    this.iconPath = iconPath;
    this.mainWindow = mainWindow;
    this.epub = new EpubMaker();
  }

  public rou_handle_windowMaximize = (): RouterFunction => {
    const instance = this;
    const { equalJson } = Mother;
    return async (event: IpcMainInvokeEvent) => {
      try {
        if (instance.mainWindow) {
          if (instance.mainWindow.isMaximized()) {
            instance.mainWindow.unmaximize();
          } else {
            instance.mainWindow.maximize();
          }
        }
        return { message: "sucess" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
  }

  public rou_handle_windowClose = (): RouterFunction => {
    const instance = this;
    const { equalJson } = Mother;
    return async (event: IpcMainInvokeEvent) => {
      try {
        if (instance.mainWindow) {
          instance.mainWindow.close();
        }
        return { message: "sucess" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
  }

  public rou_handle_windowMinimize = (): RouterFunction => {
    const instance = this;
    const { equalJson } = Mother;
    return async (event: IpcMainInvokeEvent) => {
      try {
        if (instance.mainWindow) {
          instance.mainWindow.minimize();
        }
        return { message: "sucess" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
  }

  public rou_handle_sendNotification = (): RouterFunction => {
    const instance = this;
    const { equalJson, sleep, hexaJson } = Mother;
    return async (event: IpcMainInvokeEvent, hexaBody: string) => {
      const data = (hexaJson(hexaBody)) as { title: string; body: string; silent?: boolean; callback: (mainWindow?: Dictionary) => Promise<void> };
      try {
        if (!Notification.isSupported()) {
          throw new Error("not support");
        } else {
          await sleep(50);
          const icon = nativeImage.createFromPath(instance.iconPath!);
          const notification = new Notification({
            title: data.title,
            body: data.body,
            icon: icon,
            silent: typeof data.silent === "boolean" ? data.silent : false,
          });

          notification.on("click", async () => {
            if (instance.mainWindow) {
              instance.mainWindow.show();
              if (typeof data.callback === "function") {
                await data.callback(instance.mainWindow);
              }
            }
          });

          notification.show();
        }
        return { message: "sucess" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
  }

  public rou_handle_sendCertification = (): RouterFunction => {
    const instance = this;
    const { equalJson, sleep } = Mother;
    return async (event: IpcMainInvokeEvent, title: string, body: string, json: string, route: string) => {
      try {
        if (!Notification.isSupported()) {
          const thisJson = JSON.parse(json);
          await Mother.requestSystem(route, thisJson, { headers: { "Content-Type": "application/json" } });
        } else {

          await sleep(500);

          const icon = nativeImage.createFromPath(instance.iconPath!);
          const notification = new Notification({
            title: title,
            body: body,
            icon: icon,
            silent: false,
          });

          notification.on("click", () => {
            if (instance.mainWindow) {
              instance.mainWindow.show();
            }
          });

          notification.show();
        }
        return { message: "sucess" };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
  }

  public rou_socket_createEpubProject = (): SocketFunction => {
    const instance = this;
    const epub = this.epub;
    const staticFolder = Mother.staticFolder;
    const { equalJson, equalObject, fileToMimetype, sleep, objectDeepCopy, stringToDate, shellExec, fileSystem } = Mother;
    return async (data: ArrayBuffer, field: Dictionary) => {
      const body: Dictionary = equalObject(field) as Dictionary;
      try {
        const inputMatrix: Dictionary[] = body.data;
        const defaultSubject: string[] = [ "일반" ];
        let title: string;
        let author: string;
        let publisher: string;
        let publishDate: Date;
        let subject: string[];
        let description: string;
        let chapterNumber: number;
        let titleObject: Dictionary;
        let authorObject: Dictionary;
        let publisherObject: Dictionary;
        let chapterObject: Dictionary;
        let publishDateObject: Dictionary;
        let categoryObject: Dictionary;
        let descriptionObject: Dictionary;
        let zipFileFullPath: string;
        let zipFileName: string;
        let zipFullPath: string;
        let zipFinalPath: string;
        let downloadUrl: string;
        let spawnResult: { id: string; zip: string; };
        let isbn: string;
        let isbnObject: Dictionary;

        titleObject = inputMatrix.find((o) => o.property === "title") !== undefined ? inputMatrix.find((o) => o.property === "title") as Dictionary : {};
        authorObject = inputMatrix.find((o) => o.property === "author") !== undefined ? inputMatrix.find((o) => o.property === "author") as Dictionary : {};
        publisherObject = inputMatrix.find((o) => o.property === "publisher") !== undefined ? inputMatrix.find((o) => o.property === "publisher") as Dictionary : {};
        chapterObject = inputMatrix.find((o) => o.property === "chapter") !== undefined ? inputMatrix.find((o) => o.property === "chapter") as Dictionary : {};
        publishDateObject = inputMatrix.find((o) => o.property === "publishDate") !== undefined ? inputMatrix.find((o) => o.property === "publishDate") as Dictionary : {};
        categoryObject = inputMatrix.find((o) => o.property === "category") !== undefined ? inputMatrix.find((o) => o.property === "category") as Dictionary : {};
        descriptionObject = inputMatrix.find((o) => o.property === "description") !== undefined ? inputMatrix.find((o) => o.property === "description") as Dictionary : {};
        isbnObject = inputMatrix.find((o) => o.property === "isbn") !== undefined ? inputMatrix.find((o) => o.property === "isbn") as Dictionary : {};

        chapterNumber = Number(chapterObject.finalValue);
        if (Number.isNaN(chapterNumber)) {
          chapterNumber = 8;
        }
        title = titleObject.finalValue ? titleObject.finalValue : "북 샘플";
        author = authorObject.finalValue ? authorObject.finalValue : "작가";
        publisher = publisherObject.finalValue ? publisherObject.finalValue : "Abstract cloud";
        if (categoryObject.finalValue) {
          try {
            subject = categoryObject.finalValue.split(", ");
            if (!Array.isArray(subject)) {
              subject = objectDeepCopy(defaultSubject) as string[];
            }
          } catch {
            subject = objectDeepCopy(defaultSubject) as string[];
          }
        } else {
          subject = objectDeepCopy(defaultSubject) as string[];
        }
        description = descriptionObject.finalValue ? descriptionObject.finalValue : "책 설명입니다.";
        if (publishDateObject.finalValue) {
          publishDate = stringToDate(publishDateObject.finalValue);
        } else {
          publishDate = new Date();
        }
        isbn = isbnObject.finalValue ? isbnObject.finalValue : "";

        // spawn source
        spawnResult = JSON.parse(await epub.spawnSource({
          title,
          author,
          publisher,
          publishDate,
          subject,
          description,
          chapterNumber,
          isbn
        })) as { id: string; zip: string; };
        zipFileFullPath = spawnResult.zip;

        const resultBuffer = await fileSystem("readBuffer", [ zipFileFullPath ]) as Buffer;

        return {
          field: {
            id: spawnResult.id
          },
          data: {
            buffer: resultBuffer,
            mimetype: fileToMimetype(zipFileFullPath),
          }
        }
        
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  }

  public rou_socket_optimizationFonts = (): SocketFunction => {
    const instance = this;
    const epub = this.epub;
    const { fileSystem, fileToMimetype } = Mother;
    return async (data: ArrayBuffer, field: Dictionary) => {
      try {
        const thisEpubName: string = field.epub;
        const targetPath: string = path.join(Mother.tempFolder, field.path);
        const targetFolder: string = path.dirname(targetPath);
        const epubBlob: ArrayBuffer = data;
        try {
          if (await fileSystem("exist", [ targetFolder ])) {
            // pass
          } else {
            await fileSystem("mkdir", [ targetFolder ]);
          }
        } catch { }
        const buffer: Buffer = Buffer.from(epubBlob);
        await fileSystem("writeBuffer", [ targetPath, buffer ]);

        const { base, zip } = await epub.optimizationFonts(targetPath);
        const optimizedZip: Buffer = await fileSystem("readBuffer", [ zip ]);

        return {
          buffer: optimizedZip.buffer as ArrayBuffer,
          mimetype: fileToMimetype(zip),
        }
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  }

  public rou_socket_epubCheck = (): SocketFunction => {
    const instance = this;
    const epub = this.epub;
    const tempDir: string = Mother.tempFolder;
    const { fileSystem, fileToMimetype, uniqueValue } = Mother;
    return async (data: ArrayBuffer, field: Dictionary) => {
      try {
        const epubBlob: ArrayBuffer = data;
        const buffer: Buffer = Buffer.from(epubBlob);
        const tempPath: string = path.join(tempDir, "check_" + uniqueValue("hex"));
        const epubPath: string = path.join(tempPath, "epub_" + String((new Date()).valueOf()) + "_" + uniqueValue("short") + ".epub");
        try {
          if (await fileSystem("exist", [ tempPath ])) {
            // pass
          } else {
            await fileSystem("mkdir", [ tempPath ]);
          }
        } catch { }
        await fileSystem("writeBuffer", [ epubPath, buffer ]);
        const result = await epub.inspectEpub(
          epubPath,
          true
        );
        return { result };
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  }

  public rou_on_socketOpen = (): ChannelFunction => {
    const instance = this;
    const { equalJson, sleep, prototypeMethod } = Mother;
    const prototypeObject: Dictionary = prototypeMethod(instance);
    const socketList: SocketUnit[] = [];
    for (let i = 0; i < prototypeObject.key.length; i++) {
      const thisKey: string = prototypeObject.key[ i ];
      if (/^rou_socket/g.test(thisKey)) {
        const thisType: string = thisKey.split("_")[ 2 ];
        const thisCallback: SocketFunction = (prototypeObject.value[ i ])();
        socketList.push({ link: thisType, func: thisCallback });
      }
    }
    return async (event: IpcMainEvent) => {
      const port: MessagePortMain = event.ports[ 0 ];
      port.on("message", (messageEvent: MessageEvent) => {
        const { type, requestId, data, field } = messageEvent.data as { type: string; requestId: string; data: ArrayBuffer; field: Dictionary; };
        setTimeout(() => {
          const thisIndex: number = socketList.findIndex((o: SocketUnit) => o.link === type);
          if (thisIndex !== -1) {
            socketList[ thisIndex ]!.func(data, field).then((result: BlobBuffer | Dictionary) => {

              if (result.buffer !== undefined && typeof result.mimetype === "string" && Object.keys(result).length === 2) {
                port.postMessage({ status: "success_blob", requestId, data: result });
              } else {
                result = result as Dictionary;
                if (
                  typeof result.field === "object" &&
                  result.field !== undefined &&
                  result.field !== null &&
                  typeof result.data === "object" &&
                  result.data !== undefined &&
                  result.data !== null &&
                  result.data.buffer !== undefined &&
                  typeof result.data.mimetype === "string" &&
                  Object.keys(result.data).length === 2
                ) {
                  port.postMessage({ status: "success_complex", requestId, data: result });
                } else {
                  port.postMessage({ status: "success", requestId, data: result });
                }
              }
            }).catch((e) => {
              port.postMessage({ status: "error", requestId, data: { error: (e as Error).message } });
            });
          } else {
            port.postMessage({ status: "error", requestId, data: { error: "invalid type" } });
          }
        }, 100);
      })
      port.start();
    }
  }

  public getAll = (): RouterObject => {
    const instance = this;
    const { prototypeMethod, camelToSnake } = Mother;
    let prototypeObject: Dictionary = prototypeMethod(instance);
    let thisKey: string;
    let handleList: RouterUnit[];
    let onList: ChannelUnit[];

    handleList = [];
    onList = [];
    for (let i = 0; i < prototypeObject.key.length; i++) {
      thisKey = prototypeObject.key[ i ];
      if (/^rou_handle/g.test(thisKey)) {
        const thisHandle: string = thisKey.split("_")[ 2 ];
        handleList.push({ link: camelToSnake(thisHandle), func: (prototypeObject.value[ i ])() });
      } else if (/^rou_on/g.test(thisKey)) {
        const thisChannel: string = thisKey.split("_")[ 2 ];
        onList.push({ link: camelToSnake(thisChannel), func: (prototypeObject.value[ i ])() });
      }
    }

    return { handle: handleList, on: onList };
  }

}

export { TurtleRouter };