import OpenAI from 'openai';
import { envConfig } from '../config/env.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { WebSocketGateway } from '../ws/gateway.js';
import { ToolExecutor } from './tool-executor.js';
import { buildSystemPrompt } from './prompts.js';
import { VoicePipeline } from '../voice/pipeline.js';
import { getMemoryStore } from '../memory/store.js';

let openaiClient: OpenAI | null = null;
if (envConfig.apiKey && envConfig.apiKey !== 'none') {
  openaiClient = new OpenAI({
    apiKey: envConfig.apiKey,
    baseURL: envConfig.baseURL,
  });
}

export class AISession {
  private messages: any[] = [];
  private toolExecutor: ToolExecutor;
  private voicePipeline: VoicePipeline | null = null;

  constructor(
    private toolRegistry: ToolRegistry,
    private gateway: WebSocketGateway,
    private clientId: string,
  ) {
    this.toolExecutor = new ToolExecutor(toolRegistry, gateway, clientId);
    this.initializeSession();
  }

  public setVoicePipeline(pipeline: VoicePipeline) {
    this.voicePipeline = pipeline;
  }

  private async initializeSession() {
    const memoryStore = getMemoryStore();
    let memories: any[] = [];
    let contacts: any[] = [];

    if (memoryStore.isConnected()) {
      try {
        memories = (await memoryStore.memoriesCollection?.find().limit(10).toArray()) || [];
        contacts = (await memoryStore.contactsCollection?.find().limit(10).toArray()) || [];
      } catch {
        // Ignore
      }
    } else {
      memories = memoryStore.getLocalMemories();
      contacts = memoryStore.getLocalContacts();
    }

    const systemPrompt = await buildSystemPrompt(memories, contacts);
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  public async handleTextInput(text: string) {
    this.gateway.sendMessage(this.clientId, { type: 'transcript_final', text });
    this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'thinking' });

    const lower = text.toLowerCase().trim();

    // 1. YouTube & Song Play Direct Intercept
    if (lower.startsWith('play ') || lower.includes('song') || lower.includes('tere naam') || (lower.includes('youtube') && lower.length > 8)) {
      const songName = lower.replace(/^(play|search|open)\s+(a\s+song\s+)?(in\s+youtube\s+)?(on\s+youtube\s+)?/i, '').replace(/\s+(in|on)\s+youtube/i, '').trim() || text;
      const tool = this.toolRegistry.get('open_application');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ name: songName || 'YouTube', song: songName });
        const resUrl = (res.data as any)?.url;
        if (resUrl) {
          this.gateway.sendMessage(this.clientId, { type: 'open_url', url: resUrl });
        }
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'open_application',
          success: res.success,
          message: res.message,
          data: res.data,
        });
        await this.sendAssistantResponse(res.message || `Playing ${songName} on YouTube.`);
        return;
      }
    }

    // 2. Window / Tab Closing & Screen Locking Direct Intercept
    if (lower.includes('close this window') || lower.includes('close window') || lower.includes('window close') || lower.includes('band karo window')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'close_window' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse('Closed the active window.');
        return;
      }
    }

    if (lower.includes('close this tab') || lower.includes('close tab') || lower.includes('tab close') || lower.includes('band karo tab')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'close_tab' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse('Closed the current tab.');
        return;
      }
    }

    if (lower.includes('lock screen') || lower.includes('lock the screen') || lower.includes('lock pc') || lower.includes('screen lock')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'lock' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse('Screen is now locked.');
        return;
      }
    }

    // 3. App Launching Direct Intercept
    if (lower.startsWith('open ') || lower.startsWith('kholo ') || lower.startsWith('launch ')) {
      const appName = lower.replace(/^(open|kholo|launch)\s+/i, '').trim();
      const tool = this.toolRegistry.get('open_application');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ name: appName });
        const resUrl = (res.data as any)?.url;
        if (resUrl) {
          this.gateway.sendMessage(this.clientId, { type: 'open_url', url: resUrl });
        }
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'open_application',
          success: res.success,
          message: res.message,
          data: res.data,
        });
        await this.sendAssistantResponse(res.message || `Opened ${appName}.`);
        return;
      }
    }

    // 4. Web Search Direct Intercept
    if (lower.startsWith('search ') || lower.startsWith('find ') || lower.startsWith('google ')) {
      const query = lower.replace(/^(search|find|google)\s+/i, '').trim();
      const tool = this.toolRegistry.get('web_search');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ query });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'web_search',
          success: res.success,
          message: res.message,
          data: res.data,
        });
        await this.sendAssistantResponse(res.message || `Here is what I found for ${query}.`);
        return;
      }
    }

    // 5. Brightness Control Direct Intercept
    if (lower.includes('brightness') || lower.includes('roshni') || lower.includes('screen light')) {
      const tool = this.toolRegistry.get('set_brightness');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const percentMatch = lower.match(/(\d+)\s*%/);
        const numberMatch = lower.match(/(?:to|in|at)\s*(\d+)/);

        if (percentMatch) {
          const val = parseInt(percentMatch[1], 10);
          const res = await tool.execute({ level: val });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_brightness',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Brightness set to ${val}%.`);
          return;
        } else if (numberMatch) {
          const val = parseInt(numberMatch[1], 10);
          const res = await tool.execute({ level: val });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_brightness',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Brightness set to ${val}%.`);
          return;
        } else {
          let adjust = 0;
          if (lower.includes('up') || lower.includes('increase') || lower.includes('badhao') || lower.includes('more') || lower.includes('high') || lower.includes('jyada')) {
            adjust = 20;
          } else if (lower.includes('down') || lower.includes('decrease') || lower.includes('kam') || lower.includes('low') || lower.includes('ghatao')) {
            adjust = -20;
          }
          const res = await tool.execute({ adjust: adjust !== 0 ? adjust : -20 });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_brightness',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Brightness adjusted.`);
          return;
        }
      }
    }

    // 6. Screenshot Direct Intercept
    if (lower.includes('screenshot') || lower.includes('screen shot') || lower.includes('screen capture') || lower.includes('capture screen') || lower.includes('photo khicho')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'screenshot' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse(res.message || 'Screenshot captured and saved to Desktop!');
        return;
      }
    }

    // 7. Mute / Unmute Direct Intercept
    if (lower.includes('unmute') || lower.includes('awaz chalu') || lower.includes('sound on')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'unmute' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse('System audio unmuted.');
        return;
      }
    } else if (lower.includes('mute') || lower.includes('awaz band') || lower.includes('sound off') || lower.includes('chup ho jao') || lower.includes('shant')) {
      const tool = this.toolRegistry.get('system_command');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ action: 'mute' });
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'system_command',
          success: res.success,
          message: res.message,
        });
        await this.sendAssistantResponse('System audio muted.');
        return;
      }
    }

    // 8. Direct App Match Intercept (e.g. "calculator", "calendar", "calender", "notepad", "camera", "paint")
    const commonApps = ['calculator', 'calc', 'calendar', 'calender', 'notepad', 'paint', 'camera', 'settings', 'task manager', 'spotify', 'whatsapp', 'cmd', 'terminal'];
    const matchedApp = commonApps.find((app) => lower.includes(app));
    if (matchedApp) {
      const tool = this.toolRegistry.get('open_application');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const res = await tool.execute({ name: matchedApp });
        const resUrl = (res.data as any)?.url;
        if (resUrl) {
          this.gateway.sendMessage(this.clientId, { type: 'open_url', url: resUrl });
        }
        this.gateway.sendMessage(this.clientId, {
          type: 'tool_result',
          toolName: 'open_application',
          success: res.success,
          message: res.message,
          data: res.data,
        });
        await this.sendAssistantResponse(res.message || `Opened ${matchedApp}.`);
        return;
      }
    }

    // 9. Volume Control Direct Intercept
    if (lower.includes('volume') || lower.includes('sound') || lower.includes('awaz')) {
      const tool = this.toolRegistry.get('set_volume');
      if (tool) {
        this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });
        const percentMatch = lower.match(/(\d+)\s*%/);
        const numberMatch = lower.match(/(?:to|in|at)\s*(\d+)/);

        if (percentMatch) {
          const val = parseInt(percentMatch[1], 10);
          const res = await tool.execute({ level: val });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_volume',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Volume set to ${val}%.`);
          return;
        } else if (numberMatch) {
          const val = parseInt(numberMatch[1], 10);
          const res = await tool.execute({ level: val });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_volume',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Volume set to ${val}%.`);
          return;
        } else {
          let adjust = 0;
          if (lower.includes('up') || lower.includes('increase') || lower.includes('badhao') || lower.includes('more')) {
            adjust = 20;
          } else if (lower.includes('down') || lower.includes('decrease') || lower.includes('kam') || lower.includes('low') || lower.includes('ghatao')) {
            adjust = -20;
          }
          const res = await tool.execute({ adjust: adjust !== 0 ? adjust : -20 });
          this.gateway.sendMessage(this.clientId, {
            type: 'tool_result',
            toolName: 'set_volume',
            success: res.success,
            message: res.message,
            data: res.data,
          });
          await this.sendAssistantResponse(res.message || `Volume adjusted.`);
          return;
        }
      }
    }

    this.messages.push({ role: 'user', content: text });

    if (!openaiClient || envConfig.provider === 'mock') {
      await this.sendAssistantResponse(`I am Rezoo! I received: "${text}"`);
      return;
    }

    await this.processAIResponse();
  }

  private async sendAssistantResponse(text: string) {
    this.messages.push({ role: 'assistant', content: text });
    this.gateway.sendMessage(this.clientId, { type: 'response_text', text });

    if (this.voicePipeline) {
      this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'speaking' });
      await this.voicePipeline.generateAndSendTTS(text);
    }

    this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'idle' });
  }

  private async processAIResponse() {
    if (!openaiClient) return;

    const fallbackModels = [
      envConfig.model,
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'groq/compound-mini',
    ];
    // Remove duplicates
    const modelsToTry = [...new Set(fallbackModels)];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const tools = this.toolRegistry.getOpenAITools();
        const supportsTools = !modelName.includes('compound-mini');

        const response = await openaiClient.chat.completions.create({
          model: modelName,
          messages: this.messages,
          tools: supportsTools && tools.length > 0 ? tools : undefined,
          tool_choice: supportsTools && tools.length > 0 ? 'auto' : undefined,
        });

        const message = response.choices[0].message;
        this.messages.push(message);

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'executing' });

          for (const toolCall of message.tool_calls) {
            this.gateway.sendMessage(this.clientId, {
              type: 'tool_start',
              toolName: toolCall.function.name,
              description: `Executing ${toolCall.function.name}...`,
            });

            const result = await this.toolExecutor.execute(toolCall);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

            // Groq tokenizer REQUIRES `name` on tool role messages!
            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: resultStr,
            });

            this.gateway.sendMessage(this.clientId, {
              type: 'tool_result',
              toolName: toolCall.function.name,
              success: typeof result === 'object' ? result.success : true,
              message: typeof result === 'object' ? result.message : resultStr,
            });
          }

          await this.processAIResponse();
          return;
        }

        if (message.content) {
          await this.sendAssistantResponse(message.content);
        }

        this.pruneMessages();
        return; // Success!
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt with model ${modelName} failed:`, error?.message || error);
      }
    }

    console.error('All AI models failed:', lastError?.message || lastError);
    await this.sendAssistantResponse('I am listening! How can I help you today?');
  }

  private pruneMessages() {
    if (this.messages.length > 21) {
      const systemPrompt = this.messages[0];
      const recentMessages = this.messages.slice(-20);
      this.messages = [systemPrompt, ...recentMessages];
    }
  }

  public resolveConfirmation(actionId: string, confirmed: boolean) {
    this.toolExecutor.resolveConfirmation(actionId, confirmed);
  }
}
