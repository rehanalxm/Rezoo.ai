import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('rezooAPI', {
  toggleExpand: () => ipcRenderer.send('overlay:toggle-expand'),
  minimizeWindow: () => ipcRenderer.send('overlay:minimize'),
  closeWindow: () => ipcRenderer.send('overlay:close'),
  startListening: () => ipcRenderer.send('voice:start'),
  stopListening: () => ipcRenderer.send('voice:stop'),
  onStateChange: (callback: (state: string) => void) => {
    ipcRenderer.on('assistant:state-changed', (_event, state) => callback(state));
  },
  onToggleListening: (callback: () => void) => {
    ipcRenderer.on('shortcut:toggle-listening', () => callback());
  }
});
