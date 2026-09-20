import Fuse from 'fuse.js';
import type { Contact } from '../shared/index.js';
import type { MemoryStore } from './store.js';

export class ContactManager {
  constructor(private store: MemoryStore) {}

  public async addOrUpdateContact(data: Partial<Contact>) {
    if (!data.name) throw new Error("Contact name required");
    
    await this.store.contactsCollection?.updateOne(
      { name: data.name },
      { $set: data },
      { upsert: true }
    );
  }

  public async listContacts(): Promise<Contact[]> {
    if (!this.store.contactsCollection) return [];
    return await this.store.contactsCollection.find().toArray();
  }

  public async findByNameOrNickname(query: string): Promise<Contact[]> {
    const contacts = await this.listContacts();
    const fuse = new Fuse(contacts, {
      keys: ['name', 'nickname'],
      threshold: 0.3
    });
    
    return fuse.search(query).map(result => result.item);
  }
}

// Ensure it can be exported as a singleton if needed in other scopes
