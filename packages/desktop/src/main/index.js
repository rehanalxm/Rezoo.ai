"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const overlay_1 = require("./overlay");
const tray_1 = require("./tray");
const ipc_1 = require("./ipc");
let overlayManager;
electron_1.app.whenReady().then(() => {
    overlayManager = new overlay_1.OverlayManager();
    (0, tray_1.createTray)(overlayManager);
    (0, ipc_1.setupIpcHandlers)(overlayManager);
    // Global shortcut to toggle listening/visibility
    electron_1.globalShortcut.register('CommandOrControl+Shift+R', () => {
        if (overlayManager) {
            overlayManager.show();
            // We could also trigger a listening start via IPC here
            overlayManager.getWindow()?.webContents.send('shortcut:toggle-listening');
        }
    });
    overlayManager.show();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
//# sourceMappingURL=index.js.map