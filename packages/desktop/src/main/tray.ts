import { Tray, Menu, nativeImage, app } from 'electron';
import { OverlayManager } from './overlay';

let tray: Tray | null = null;

export function createTray(overlayManager: OverlayManager) {
  // Create a simple colored circle icon
  const icon = nativeImage.createEmpty();
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Rezoo',
      click: () => {
        const win = overlayManager.getWindow();
        if (win?.isVisible()) {
          overlayManager.hide();
        } else {
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
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Rezoo AI');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    const win = overlayManager.getWindow();
    if (win?.isVisible()) {
      overlayManager.hide();
    } else {
      overlayManager.show();
    }
  });
}
