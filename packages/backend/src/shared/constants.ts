// ============================================================
// @rezoo/shared — Constants
// ============================================================

/** WebSocket close codes */
export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  SERVER_ERROR: 1011,
  RESTART: 4000,
  UNAUTHORIZED: 4001,
} as const;

/** Audio configuration */
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000, // 16kHz for Whisper
  CHANNELS: 1, // Mono
  BIT_DEPTH: 16, // 16-bit PCM
  CHUNK_DURATION_MS: 100, // Send audio every 100ms
  SILENCE_THRESHOLD: 500, // ms of silence before stopping
  MAX_RECORDING_MS: 30000, // Max 30s per utterance
} as const;

/** TTS voices available from OpenAI */
export const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

/** Default Rezoo assistant name */
export const ASSISTANT_NAME = 'Rezoo';

/** Wake word phrase */
export const WAKE_WORD = 'Hey Rezoo';

/** State colors for UI */
export const STATE_COLORS: Record<string, string> = {
  idle: '#3B82F6', // blue
  listening: '#10B981', // green
  thinking: '#F59E0B', // yellow/amber
  speaking: '#8B5CF6', // purple
  executing: '#F97316', // orange
};
