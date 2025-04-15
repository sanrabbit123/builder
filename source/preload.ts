import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { UpdateInfo, ProgressInfo } from 'electron-updater'; 

// === 기존 API 노출 ===
contextBridge.exposeInMainWorld("api", {
  // 예시: greet 함수 (기존 로직 유지)
  greet: (name: string): Promise<string> => ipcRenderer.invoke("greet", name),
  // 여기에 다른 기존 api 함수들이 있다면 그대로 둡니다.
});

// === 신규: electron-updater API 노출 ===
contextBridge.exposeInMainWorld('updaterAPI', {
  // --- Main -> Renderer 이벤트 리스너 등록 함수 ---
  onStatusUpdate: (callback: (message: string) => void) =>
    ipcRenderer.on('update-status', (_event: IpcRendererEvent, message: string) => callback(message)),

  onError: (callback: (errorMessage: string) => void) =>
    ipcRenderer.on('update-error', (_event: IpcRendererEvent, errorMessage: string) => callback(errorMessage)),

  onProgress: (callback: (progress: ProgressInfo) => void) =>
    ipcRenderer.on('update-download-progress', (_event: IpcRendererEvent, progress: ProgressInfo) => callback(progress)),

  onUpdateReady: (callback: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update-ready', (_event: IpcRendererEvent, info: UpdateInfo) => callback(info)),

  // --- Renderer -> Main 이벤트 송신 함수 ---
  requestInstallUpdate: () => ipcRenderer.send('install-update-request'),

  // --- 리스너 정리 함수 ---
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-ready');
  },
});