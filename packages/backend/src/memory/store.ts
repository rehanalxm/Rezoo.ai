import { MongoClient, Collection, Db } from 'mongodb';
import { envConfig } from '../config/env.js';
import type { Contact, Memory } from '@rezoo/shared';
import fs from 'fs';
import path from 'path';

interface LocalData {
  memories: Memory[];
  contacts: Contact[];
}

export class MemoryStore {
  private client: MongoClient;
  private db: Db | null = null;
  private connected = false;
  private localFilePath: string;
  private localData: LocalData = { memories: [], contacts: [] };

  public memoriesCollection: Collection<Memory> | null = null;
  public contactsCollection: Collection<Contact> | null = null;
  public conversationsCollection: Collection<any> | null = null;

  constructor() {
    this.client = new MongoClient(envConfig.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    
    // Local data storage directory
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.localFilePath = path.join(dataDir, 'memory.json');
    this.loadLocalData();
  }

  private loadLocalData() {
    try {
      if (fs.existsSync(this.localFilePath)) {
        const raw = fs.readFileSync(this.localFilePath, 'utf-8');
        this.localData = JSON.parse(raw);
      }
    } catch {
      this.localData = { memories: [], contacts: [] };
    }
  }

  public saveLocalData() {
    try {
      fs.writeFileSync(this.localFilePath, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not save local memory file:', e);
    }
  }

  public getLocalMemories(): Memory[] {
    return this.localData.memories;
  }

  public getLocalContacts(): Contact[] {
    return this.localData.contacts;
  }

  public setLocalMemory(key: string, value: string) {
    const idx = this.localData.memories.findIndex((m) => m.key.toLowerCase() === key.toLowerCase());
    const item: Memory = {
      key,
      value,
      category: 'fact',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (idx >= 0) {
      this.localData.memories[idx] = item;
    } else {
      this.localData.memories.push(item);
    }
    this.saveLocalData();
  }

  public setLocalContact(contact: Partial<Contact>) {
    const idx = this.localData.contacts.findIndex(
      (c) => c.name.toLowerCase() === (contact.name || '').toLowerCase()
    );
    const item: Contact = {
      name: contact.name || 'Unknown',
      nicknames: contact.nicknames || ((contact as any).nickname ? [(contact as any).nickname] : []),
      phone: contact.phone,
      email: contact.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (idx >= 0) {
      this.localData.contacts[idx] = { ...this.localData.contacts[idx], ...item };
    } else {
      this.localData.contacts.push(item);
    }
    this.saveLocalData();
  }

  public async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      this.db = this.client.db();

      this.memoriesCollection = this.db.collection('memories');
      this.contactsCollection = this.db.collection('contacts');
      this.conversationsCollection = this.db.collection('conversations');

      this.connected = true;
      console.log('✅ Connected to MongoDB');
      return true;
    } catch {
      console.log('📁 Using local zero-setup file storage (data/memory.json) for memory and contacts.');
      this.connected = false;
      return false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async close() {
    if (this.connected) {
      await this.client.close();
    }
  }
}

let _store: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
  if (!_store) {
    _store = new MemoryStore();
  }
  return _store;
}
