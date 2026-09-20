"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
function setupIpcHandlers(overlayManager) {
    electron_1.ipcMain.on('overlay:toggle-expand', () => {
        overlayManager.toggleExpand();
    });
    electron_1.ipcMain.on('overlay:drag', (event, x, y) => {
        overlayManager.drag(x, y);
    });
    electron_1.ipcMain.on('voice:start', () => {
        // Optionally relay to backend or handle logic
    });
    electron_1.ipcMain.on('voice:stop', () => {
        // Handle voice stop
    });
    electron_1.ipcMain.handle('assistant:state', () => {
        // Return state
        return 'idle';
    });
}
//# sourceMappingURL=ipc.js.map