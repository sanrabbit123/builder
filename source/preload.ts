import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  toggleMaximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  minimize: () => ipcRenderer.send("window-minimize"),
});

contextBridge.exposeInMainWorld("api", {
  greet: (name: string): Promise<string> => ipcRenderer.invoke("greet", name),
});