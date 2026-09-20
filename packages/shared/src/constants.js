"use strict";
// ============================================================
// @rezoo/shared — Constants
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_COLORS = exports.WAKE_WORD = exports.ASSISTANT_NAME = exports.TTS_VOICES = exports.AUDIO_CONFIG = exports.WS_CLOSE_CODES = void 0;
/** WebSocket close codes */
exports.WS_CLOSE_CODES = {
    NORMAL: 1000,
    GOING_AWAY: 1001,
    SERVER_ERROR: 1011,
    RESTART: 4000,
    UNAUTHORIZED: 4001,
};
/** Audio configuration */
exports.AUDIO_CONFIG = {
    SAMPLE_RATE: 16000, // 16kHz for Whisper
    CHANNELS: 1, // Mono
    BIT_DEPTH: 16, // 16-bit PCM
    CHUNK_DURATION_MS: 100, // Send audio every 100ms
    SILENCE_THRESHOLD: 500, // ms of silence before stopping
    MAX_RECORDING_MS: 30000, // Max 30s per utterance
};
/** TTS voices available from OpenAI */
exports.TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
/** Default Rezoo assistant name */
exports.ASSISTANT_NAME = 'Rezoo';
/** Wake word phrase */
exports.WAKE_WORD = 'Hey Rezoo';
/** State colors for UI */
exports.STATE_COLORS = {
    idle: '#3B82F6', // blue
    listening: '#10B981', // green
    thinking: '#F59E0B', // yellow/amber
    speaking: '#8B5CF6', // purple
    executing: '#F97316', // orange
};
//# sourceMappingURL=constants.js.map