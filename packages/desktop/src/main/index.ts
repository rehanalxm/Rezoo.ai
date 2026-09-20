import { app, globalShortcut, session } from 'electron';
import { OverlayManager } from './overlay';
import { createTray } from './tray';
import { setupIpcHandlers } from './ipc';

app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');

let overlayManager: OverlayManager;

app.whenReady().then(() => {
  // Grant microphone & media permissions automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  overlayManager = new OverlayManager();
  createTray(overlayManager);
  setupIpcHandlers(overlayManager);

  // Global shortcut to toggle listening/visibility
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (overlayManager) {
      overlayManager.show();
      // We could also trigger a listening start via IPC here
      overlayManager.getWindow()?.webContents.send('shortcut:toggle-listening');
    }
  });

  overlayManager.show();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
