export class BargeInManager {
  private currentAbortController: AbortController | null = null;
  private isSpeakingOrExecuting = false;

  public triggerBargeIn() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isSpeakingOrExecuting = false;
  }

  public startOperation(): AbortController {
    this.triggerBargeIn(); // cancel any previous operation
    this.currentAbortController = new AbortController();
    this.isSpeakingOrExecuting = true;
    return this.currentAbortController;
  }

  public endOperation(controller: AbortController) {
    if (this.currentAbortController === controller) {
      this.currentAbortController = null;
      this.isSpeakingOrExecuting = false;
    }
  }

  public isActive(): boolean {
    return this.isSpeakingOrExecuting;
  }
}
