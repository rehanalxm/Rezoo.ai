import type { ToolRegistry } from '../tools/registry.js';
import type { WebSocketGateway } from '../ws/gateway.js';
import type OpenAI from 'openai';

export class ToolExecutor {
  private pendingConfirmations = new Map<string, { resolve: (val: boolean) => void; timeout: NodeJS.Timeout }>();

  constructor(
    private registry: ToolRegistry,
    private gateway: WebSocketGateway,
    private clientId: string,
  ) {}

  public async execute(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall): Promise<any> {
    const tool = this.registry.get(toolCall.function.name);
    if (!tool) {
      return { success: false, message: `Tool "${toolCall.function.name}" not found.` };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);

      // Check if confirmation is needed
      if (tool.requiresConfirmation) {
        const confirmed = await this.requestConfirmation(toolCall.id, tool.name, tool.description, args);
        if (!confirmed) {
          return { success: false, message: 'Action cancelled by user.' };
        }
      }

      // Execute with 30s timeout
      const result = await Promise.race([
        tool.execute(args),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timed out after 30s')), 30000)
        ),
      ]);

      return result;
    } catch (error: any) {
      console.error(`Error executing tool ${tool.name}:`, error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  private requestConfirmation(actionId: string, toolName: string, description: string, params: Record<string, unknown>): Promise<boolean> {
    return new Promise((resolve) => {
      // Auto-cancel after 30s
      const timeout = setTimeout(() => {
        this.pendingConfirmations.delete(actionId);
        resolve(false);
      }, 30000);

      this.pendingConfirmations.set(actionId, { resolve, timeout });

      // Send confirmation request to client
      this.gateway.sendMessage(this.clientId, {
        type: 'confirm_request',
        actionId,
        toolName,
        description,
        params,
      });
    });
  }

  public resolveConfirmation(actionId: string, confirmed: boolean) {
    const pending = this.pendingConfirmations.get(actionId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(confirmed);
      this.pendingConfirmations.delete(actionId);
    }
  }
}
