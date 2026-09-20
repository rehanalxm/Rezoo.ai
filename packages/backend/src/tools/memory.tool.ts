import type { ToolRegistry } from './registry.js';
import { getMemoryStore } from '../memory/store.js';
import { ContactManager } from '../memory/contacts.js';

export async function registerMemoryTools(registry: ToolRegistry) {
  const store = getMemoryStore();
  const contactManager = new ContactManager(store);

  registry.register({
    name: 'remember',
    description: 'Store information in memory for later recall. Use when the user says "remember this" or similar.',
    category: 'memory',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Short key/label (e.g., "sanu_phone", "favorite_color")' },
        value: { type: 'string', description: 'The information to remember' },
      },
      required: ['key', 'value'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const key = args.key as string;
        const value = args.value as string;

        if (store.isConnected() && store.memoriesCollection) {
          await store.memoriesCollection.updateOne(
            { key },
            { $set: { key, value, updatedAt: new Date() } },
            { upsert: true }
          );
        } else {
          // Local zero-setup storage
          store.setLocalMemory(key, value);
        }
        return { success: true, message: `Remembered: ${key} = ${value}` };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });

  registry.register({
    name: 'recall',
    description: 'Search stored memories by keyword or query.',
    category: 'memory',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for in memory' },
      },
      required: ['query'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const query = (args.query as string).toLowerCase();

        if (store.isConnected() && store.memoriesCollection) {
          const results = await store.memoriesCollection
            .find({
              $or: [
                { key: { $regex: query, $options: 'i' } },
                { value: { $regex: query, $options: 'i' } },
              ],
            })
            .limit(10)
            .toArray();
          return { success: true, message: JSON.stringify(results || []), data: results };
        } else {
          // Search local memory
          const local = store.getLocalMemories();
          const matches = local.filter(
            (m) => m.key.toLowerCase().includes(query) || m.value.toLowerCase().includes(query)
          );
          return {
            success: true,
            message: matches.length > 0 ? matches.map((m) => `${m.key}: ${m.value}`).join(', ') : 'No matching memory found',
            data: matches,
          };
        }
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });

  registry.register({
    name: 'manage_contact',
    description: 'Add, update, find, or list contacts. Supports nickname-based lookup.',
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Contact operation', enum: ['add', 'update', 'find', 'list'] },
        name: { type: 'string', description: 'Contact name or nickname' },
        phone: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address' },
        nickname: { type: 'string', description: 'Nickname for the contact' },
      },
      required: ['action'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const action = args.action as string;

        if (store.isConnected()) {
          if (action === 'find' && args.name) {
            const found = await contactManager.findByNameOrNickname(args.name as string);
            if (found.length === 0) {
              return { success: true, message: `No contacts found matching "${args.name}"` };
            }
            return { success: true, message: `Found: ${found.map((c) => c.name).join(', ')}`, data: found };
          }

          if (action === 'add' || action === 'update') {
            await contactManager.addOrUpdateContact(args as any);
            return { success: true, message: `Contact ${args.name || 'unknown'} saved.` };
          }

          if (action === 'list') {
            const list = await contactManager.listContacts();
            return { success: true, message: `${list.length} contacts found`, data: list };
          }
        } else {
          // Local fallback
          if (action === 'add' || action === 'update') {
            store.setLocalContact(args as any);
            return { success: true, message: `Contact ${args.name} saved locally.` };
          }
          if (action === 'list') {
            const list = store.getLocalContacts();
            return { success: true, message: `${list.length} contacts found`, data: list };
          }
          if (action === 'find') {
            const nameQuery = (args.name as string || '').toLowerCase();
            const list = store.getLocalContacts();
            const found = list.filter((c) => c.name.toLowerCase().includes(nameQuery));
            return {
              success: true,
              message: found.length > 0 ? `Found: ${found.map((c) => c.name).join(', ')}` : 'No contact found',
              data: found,
            };
          }
        }

        return { success: false, message: 'Invalid action' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });

  registry.register({
    name: 'send_message',
    description: 'Send a message to a contact via WhatsApp, SMS, or email. (Phase 2 — currently logs the message)',
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Contact name, nickname, phone number, or email' },
        message: { type: 'string', description: 'Message content' },
        via: { type: 'string', description: 'Channel to send through', enum: ['whatsapp', 'sms', 'email'] },
      },
      required: ['to', 'message'],
    },
    requiresConfirmation: true,
    execute: async (args: Record<string, unknown>) => {
      const to = args.to as string;
      const message = args.message as string;
      const via = (args.via as string) || 'whatsapp';

      console.log(`📨 [Message via ${via}] To: ${to} → "${message}"`);
      return { success: true, message: `Message to ${to} via ${via}: "${message}" (simulated — Phase 2)` };
    },
  });
}
