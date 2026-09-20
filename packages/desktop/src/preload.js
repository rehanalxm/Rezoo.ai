"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('rezooAPI', {
    toggleExpand: () => electron_1.ipcRenderer.send('overlay:toggle-expand'),
    startDrag: (x, y) => electron_1.ipcRenderer.send('overlay:drag', x, y),
    startListening: () => electron_1.ipcRenderer.send('voice:start'),
    stopListening: () => electron_1.ipcRenderer.send('voice:stop'),
    onStateChange: (callback) => {
        electron_1.ipcRenderer.on('assistant:state-changed', (_event, state) => callback(state));
    },
    onToggleListening: (callback) => {
        electron_1.ipcRenderer.on('shortcut:toggle-listening', () => callback());
    }
});
//# sourceMappingURL=preload.js.map