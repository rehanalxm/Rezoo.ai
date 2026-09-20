"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayManager = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
class OverlayManager {
    window = null;
    isExpanded = false;
    constructor() {
        this.createWindow();
    }
    createWindow() {
        this.window = new electron_1.BrowserWindow({
            width: 80,
            height: 80,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            hasShadow: false,
            webPreferences: {
                preload: path_1.default.join(__dirname, '../preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });
        this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        this.window.setAlwaysOnTop(true, 'screen-saver');
        // Load renderer
        const isDev = !electron_1.app.isPackaged;
        if (isDev) {
            this.window.loadURL('http://localhost:5173');
        }
        else {
            this.window.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
        }
        // Position in bottom-right corner
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        this.setPosition(width - 100, height - 100);
    }
    show() {
        this.window?.showInactive();
    }
    hide() {
        this.window?.hide();
    }
    expand(width = 400, height = 500) {
        if (!this.window)
            return;
        this.isExpanded = true;
        const bounds = this.window.getBounds();
        this.window.setBounds({
            x: bounds.x - (width - bounds.width),
            y: bounds.y - (height - bounds.height),
            width,
            height,
        });
        this.window.setResizable(true);
    }
    collapse() {
        if (!this.window)
            return;
        this.isExpanded = false;
        const bounds = this.window.getBounds();
        this.window.setBounds({
            x: bounds.x + (bounds.width - 80),
            y: bounds.y + (bounds.height - 80),
            width: 80,
            height: 80,
        });
        this.window.setResizable(false);
    }
    toggleExpand() {
        if (this.isExpanded) {
            this.collapse();
        }
        else {
            this.expand();
        }
    }
    setPosition(x, y) {
        this.window?.setPosition(x, y);
    }
    drag(xOffset, yOffset) {
        if (!this.window)
            return;
        const { x, y } = this.window.getBounds();
        this.window.setPosition(x + xOffset, y + yOffset);
    }
    getWindow() {
        return this.window;
    }
    getIsExpanded() {
        return this.isExpanded;
    }
}
exports.OverlayManager = OverlayManager;
//# sourceMappingURL=overlay.js.map