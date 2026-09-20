import OpenAI, { toFile } from 'openai';
import { envConfig } from '../config/env.js';
import type { AISession } from '../ai/session.js';
import type { WebSocketGateway } from '../ws/gateway.js';
import { BargeInManager } from './barge-in.js';

let openaiClient: OpenAI | null = null;
if (envConfig.apiKey && envConfig.apiKey !== 'none') {
  openaiClient = new OpenAI({
    apiKey: envConfig.apiKey,
    baseURL: envConfig.baseURL,
  });
}

export class VoicePipeline {
  private audioBuffer: Buffer[] = [];
  private isListening = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private bargeInManager = new BargeInManager();

  constructor(
    private aiSession: AISession,
    private gateway: WebSocketGateway,
    private clientId: string
  ) {}

  public startListening() {
    this.isListening = true;
    this.audioBuffer = [];
    this.resetSilenceTimer();
  }

  public stopListening() {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
  }

  public receiveAudio(data: string) {
    if (!this.isListening) return;
    const chunk = Buffer.from(data, 'base64');
    this.audioBuffer.push(chunk);
    this.resetSilenceTimer();
  }

  public bargeIn() {
    this.bargeInManager.triggerBargeIn();
    this.gateway.sendMessage(this.clientId, { type: 'stop_playback' });
    this.audioBuffer = [];
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => this.processAudioBuffer(), 1200); // 1.2s silence triggers processing
  }

  private async processAudioBuffer() {
    if (this.audioBuffer.length === 0) return;

    const audioData = Buffer.concat(this.audioBuffer);
    this.audioBuffer = [];

    try {
      if (openaiClient && envConfig.provider !== 'mock') {
        const file = await toFile(audioData, 'audio.webm', { type: 'audio/webm' });
        
        const transcription = await openaiClient.audio.transcriptions.create({
          file,
          model: envConfig.sttModel,
        });

        if (transcription.text) {
          await this.aiSession.handleTextInput(transcription.text);
        }
      } else {
        // Fallback: Client can use Web Speech API directly
        this.gateway.sendMessage(this.clientId, {
          type: 'error',
          message: 'Audio received. Tip: You can also use direct voice recognition or add a free Groq API key.',
        });
      }
    } catch (error: any) {
      console.error('Error in voice pipeline transcription:', error?.message || error);
      this.gateway.sendMessage(this.clientId, {
        type: 'error',
        message: 'Speech transcription failed. You can speak or type directly.',
      });
      this.gateway.sendMessage(this.clientId, { type: 'state_change', state: 'idle' });
    }
  }

  public async generateAndSendTTS(text: string) {
    // If we have an OpenAI-compatible TTS provider (like OpenAI official), use it
    if (openaiClient && envConfig.provider === 'openai') {
      const abortController = this.bargeInManager.startOperation();
      try {
        const mp3 = await openaiClient.audio.speech.create({
          model: 'tts-1',
          voice: envConfig.ttsVoice as any,
          input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        if (abortController.signal.aborted) return;

        this.gateway.sendMessage(this.clientId, {
          type: 'audio_playback',
          data: buffer.toString('base64'),
        });
        return;
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.warn('TTS cloud audio skipped, client will use native free speech synthesis.');
        }
      } finally {
        this.bargeInManager.endOperation(abortController);
      }
    }

    // Default 100% Free: Client automatically speaks response using native Web Speech Synthesis API!
  }

  public stop() {
    this.stopListening();
    this.bargeInManager.triggerBargeIn();
  }
}
