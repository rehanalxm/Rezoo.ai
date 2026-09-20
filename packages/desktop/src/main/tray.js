"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTray = createTray;
const electron_1 = require("electron");
let tray = null;
function createTray(overlayManager) {
    // Create a simple colored circle icon
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show/Hide Rezoo',
            click: () => {
                const win = overlayManager.getWindow();
                if (win?.isVisible()) {
                    overlayManager.hide();
                }
                else {
                    overlayManager.show();
                }
            }
        },
        {
            label: 'Start Listening',
            click: () => {
                overlayManager.show();
                overlayManager.getWindow()?.webContents.send('voice:start');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('Rezoo AI');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        const win = overlayManager.getWindow();
        if (win?.isVisible()) {
            overlayManager.hide();
        }
        else {
            overlayManager.show();
        }
    });
}
//# sourceMappingURL=tray.js.map