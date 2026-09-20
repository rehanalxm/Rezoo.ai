/** WebSocket close codes */
export declare const WS_CLOSE_CODES: {
    readonly NORMAL: 1000;
    readonly GOING_AWAY: 1001;
    readonly SERVER_ERROR: 1011;
    readonly RESTART: 4000;
    readonly UNAUTHORIZED: 4001;
};
/** Audio configuration */
export declare const AUDIO_CONFIG: {
    readonly SAMPLE_RATE: 16000;
    readonly CHANNELS: 1;
    readonly BIT_DEPTH: 16;
    readonly CHUNK_DURATION_MS: 100;
    readonly SILENCE_THRESHOLD: 500;
    readonly MAX_RECORDING_MS: 30000;
};
/** TTS voices available from OpenAI */
export declare const TTS_VOICES: readonly ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
export type TTSVoice = (typeof TTS_VOICES)[number];
/** Default Rezoo assistant name */
export declare const ASSISTANT_NAME = "Rezoo";
/** Wake word phrase */
export declare const WAKE_WORD = "Hey Rezoo";
/** State colors for UI */
export declare const STATE_COLORS: Record<string, string>;
//# sourceMappingURL=constants.d.ts.map