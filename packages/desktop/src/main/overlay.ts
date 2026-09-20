import { BrowserWindow, screen, app } from 'electron';
import path from 'path';

export class OverlayManager {
  private window: BrowserWindow | null = null;
  private isExpanded = true;
  private expandedWidth = 380;
  private expandedHeight = 600;
  private collapsedSize = 80;

  constructor() {
    this.createWindow();
  }

  private createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Position window in the exact center of the screen
    const centerX = Math.round((width - this.expandedWidth) / 2);
    const centerY = Math.round((height - this.expandedHeight) / 2);

    this.window = new BrowserWindow({
      width: this.expandedWidth,
      height: this.expandedHeight,
      x: centerX,
      y: centerY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      resizable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setAlwaysOnTop(true, 'screen-saver');

    // Load renderer
    const isDev = !app.isPackaged;
    if (isDev) {
      this.window.loadURL('http://localhost:5173');
    } else {
      this.window.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.window.show();
    this.window.focus();
  }

  public show() {
    this.window?.show();
    this.window?.focus();
  }

  public hide() {
    this.window?.hide();
  }

  public minimize() {
    // Minimize transitions into floating Assistive Touch bubble on screen
    this.collapse();
  }

  public close() {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
    app.quit();
  }

  public expand() {
    if (!this.window) return;
    this.isExpanded = true;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const centerX = Math.round((width - this.expandedWidth) / 2);
    const centerY = Math.round((height - this.expandedHeight) / 2);
    this.window.setBounds({
      x: centerX,
      y: centerY,
      width: this.expandedWidth,
      height: this.expandedHeight,
    });
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.focus();
  }

  public collapse() {
    if (!this.window) return;
    this.isExpanded = false;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    this.window.setBounds({
      x: width - this.collapsedSize - 24,
      y: height - this.collapsedSize - 24,
      width: this.collapsedSize,
      height: this.collapsedSize,
    });
    this.window.setAlwaysOnTop(true, 'screen-saver');
  }

  public toggleExpand() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  public setPosition(x: number, y: number) {
    this.window?.setPosition(x, y);
  }

  public getWindow() {
    return this.window;
  }

  public getIsExpanded() {
    return this.isExpanded;
  }
}
