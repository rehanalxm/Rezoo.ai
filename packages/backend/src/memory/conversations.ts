import type { ConversationEntry } from '@rezoo/shared';
import type { MemoryStore } from './store.js';

export class ConversationManager {
  constructor(private store: MemoryStore) {}

  public async addEntry(sessionId: string, role: string, content: string, toolCalls?: any[]) {
    const entry: Partial<ConversationEntry> = {
      role: role as any,
      content,
      timestamp: new Date(),
    };
    if (toolCalls) (entry as any).toolCalls = toolCalls;

    await this.store.conversationsCollection?.updateOne(
      { sessionId },
      { $push: { messages: entry } as any },
      { upsert: true }
    );
  }

  public async getHistory(sessionId: string, limit: number = 20) {
    const session = await this.store.conversationsCollection?.findOne({ sessionId });
    if (!session || !session.messages) return [];

    return session.messages.slice(-limit);
  }

  public async summarizeSession(sessionId: string) {
    console.log(`Summarizing session ${sessionId}...`);
  }

  public async getRecentSummaries(_limit: number = 5) {
    return [];
  }
}
