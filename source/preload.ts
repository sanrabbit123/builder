import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

interface Dictionary {
  [ key: string ]: any;
}
type ElectronSocketSend = {
  type: string;
  requestId: string;
  data: Blob | ArrayBuffer;
  field: Dictionary;
}

let port1: MessagePort | null = null;
let port2: MessagePort | null = null;
let eventsDictionary: Dictionary = {};

contextBridge.exposeInMainWorld("electronAPI", {

  // get
  toggleMaximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),
  minimize: () => ipcRenderer.invoke("window-minimize"),

  // post
  sendCertification: (title: string, body: string, json: string, route: string) => ipcRenderer.invoke("send-certification", title, body, json, route),
  sendNotification: (hexaBody: string) => ipcRenderer.invoke("send-notification", hexaBody),

  // socket
  portReady: () => {
    const channel = new MessageChannel();
    port1 = channel.port1;
    port2 = channel.port2;
    ipcRenderer.postMessage("socket-open", null, [ port1 ]);
    port2.start();
  },
  socketSend: (message: ElectronSocketSend) => {
    if (port2 !== null) {
      setTimeout(async () => {
        if (port2 !== null) {
          const arrayBuffer: ArrayBuffer = await (message.data as Blob).arrayBuffer();
          message.data = arrayBuffer as ArrayBuffer;
          port2.postMessage(message);
        }
      }, 500);
    }
  },
  portEnd: (receiveMessageToken: string) => {
    return new Promise((resolve, reject) => {
      if (port2 !== null) {
        eventsDictionary[ receiveMessageToken ] = (event: MessageEvent) => {
          const data = event.data;
          if (data.status === "success_blob") {
            const arrayBuffer: ArrayBuffer = data.data.buffer;
            const mimetype: string = data.data.mimetype;
            resolve({
              status: "success",
              requestId: data.requestId,
              data: new Blob([ arrayBuffer ], { type: mimetype })
            });
          } else if (data.status === "success_complex") {
            const field: Dictionary = data.data.field;
            const arrayBuffer: ArrayBuffer = data.data.data.buffer;
            const mimetype: string = data.data.data.mimetype;
            resolve({
              status: "success",
              requestId: data.requestId,
              data: {
                field,
                blob: new Blob([ arrayBuffer ], { type: mimetype }),
              }
            });
          } else {
            resolve(data);
          }
          if (port2 !== null) {
            port2.removeEventListener("message", eventsDictionary[ receiveMessageToken ]);
          }
        };
        port2.addEventListener("message", eventsDictionary[ receiveMessageToken ]);
      } else {
        reject(new Error("invalid port status"));
      }
    })
  },

});