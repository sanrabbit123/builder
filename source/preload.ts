import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("api", {
  greet: (name: string): Promise<string> => ipcRenderer.invoke("greet", name),
});