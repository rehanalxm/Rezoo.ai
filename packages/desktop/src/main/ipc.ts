import { ipcMain } from 'electron';
import { OverlayManager } from './overlay';

export function setupIpcHandlers(overlayManager: OverlayManager) {
  ipcMain.on('overlay:toggle-expand', () => {
    overlayManager.toggleExpand();
  });

  ipcMain.on('overlay:minimize', () => {
    overlayManager.minimize();
  });

  ipcMain.on('overlay:close', () => {
    overlayManager.close();
  });

  ipcMain.on('voice:start', () => {
    // Optionally relay to backend or handle logic
  });

  ipcMain.on('voice:stop', () => {
    // Handle voice stop
  });

  ipcMain.handle('assistant:state', () => {
    // Return state
    return 'idle';
  });
}
