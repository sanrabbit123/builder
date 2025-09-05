import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  toggleMaximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  minimize: () => ipcRenderer.send("window-minimize"),
  showNotification: (title: string, body: string, json: string, route: string) => ipcRenderer.send("show-notification", title, body, json, route),
});

contextBridge.exposeInMainWorld("api", {
  greet: (name: string): Promise<string> => ipcRenderer.invoke("greet", name),
});