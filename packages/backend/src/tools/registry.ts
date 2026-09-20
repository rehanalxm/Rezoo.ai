import type { RegisteredTool } from '../shared/index.js';
import type OpenAI from 'openai';

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  public register(tool: RegisteredTool) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  public getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  public getOpenAITools(): OpenAI.Chat.ChatCompletionTool[] {
    return this.getAll().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any
      }
    }));
  }
}
