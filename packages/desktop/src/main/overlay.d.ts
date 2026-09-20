import { BrowserWindow } from 'electron';
export declare class OverlayManager {
    private window;
    private isExpanded;
    constructor();
    private createWindow;
    show(): void;
    hide(): void;
    expand(width?: number, height?: number): void;
    collapse(): void;
    toggleExpand(): void;
    setPosition(x: number, y: number): void;
    drag(xOffset: number, yOffset: number): void;
    getWindow(): BrowserWindow | null;
    getIsExpanded(): boolean;
}
//# sourceMappingURL=overlay.d.ts.map