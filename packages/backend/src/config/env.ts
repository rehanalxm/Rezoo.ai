import { config } from 'dotenv';
import { resolve } from 'path';

// Try loading .env from multiple locations
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
];

for (const p of envPaths) {
  config({ path: p });
}

export type LLMProvider = 'groq' | 'gemini' | 'openai' | 'ollama' | 'mock';

export interface RezooConfig {
  port: number;
  provider: LLMProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
  sttModel: string;
  mongoUri: string;
  ttsVoice: string;
  picovoiceAccessKey?: string;
}

// Auto-detect best available provider (Prioritizing free tiers)
const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
const ollamaUrl = process.env.OLLAMA_BASE_URL;

let provider: LLMProvider = 'mock';
let apiKey = 'mock';
let baseURL: string | undefined = undefined;
let model = 'gpt-4o-mini';
let sttModel = 'whisper-1';

if (groqKey) {
  provider = 'groq';
  apiKey = groqKey;
  baseURL = 'https://api.groq.com/openai/v1';
  model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
  sttModel = 'whisper-large-v3-turbo';
} else if (geminiKey) {
  provider = 'gemini';
  apiKey = geminiKey;
  baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
  model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  sttModel = 'whisper-1';
} else if (openAiApiKey) {
  provider = 'openai';
  apiKey = openAiApiKey;
  baseURL = undefined;
  model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  sttModel = 'whisper-1';
} else if (ollamaUrl) {
  provider = 'ollama';
  apiKey = 'ollama';
  baseURL = ollamaUrl || 'http://localhost:11434/v1';
  model = process.env.OLLAMA_MODEL || 'llama3.2';
  sttModel = 'local';
} else {
  provider = 'mock';
  apiKey = 'none';
  console.warn('⚠️  No LLM API Key detected in .env (FREE Mode active).');
  console.warn('👉 Get a 100% FREE key from:');
  console.warn('   - Groq (Recommended - Fast & Free): https://console.groq.com/keys');
  console.warn('   - Google AI Studio (Free Gemini): https://aistudio.google.com/app/apikey');
}

export const envConfig: RezooConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  provider,
  apiKey,
  baseURL,
  model,
  sttModel,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rezoo',
  ttsVoice: process.env.TTS_VOICE || 'nova',
  picovoiceAccessKey: process.env.PICOVOICE_ACCESS_KEY,
};
