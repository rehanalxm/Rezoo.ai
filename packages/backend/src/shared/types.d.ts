/** Current state of the Rezoo assistant */
export type RezooState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
/** Client → Server messages */
export type ClientMessage = {
    type: 'audio_chunk';
    data: string;
} | {
    type: 'wake_word_detected';
} | {
    type: 'start_listening';
} | {
    type: 'stop_listening';
} | {
    type: 'cancel_current';
} | {
    type: 'confirm_action';
    actionId: string;
    confirmed: boolean;
} | {
    type: 'text_input';
    text: string;
};
/** Server → Client messages */
export type ServerMessage = {
    type: 'state_change';
    state: RezooState;
} | {
    type: 'transcript_partial';
    text: string;
} | {
    type: 'transcript_final';
    text: string;
} | {
    type: 'response_text';
    text: string;
} | {
    type: 'audio_playback';
    data: string;
} | {
    type: 'audio_playback_done';
} | {
    type: 'stop_playback';
} | {
    type: 'tool_start';
    toolName: string;
    description: string;
} | {
    type: 'tool_result';
    toolName: string;
    success: boolean;
    message: string;
    data?: any;
} | {
    type: 'open_url';
    url: string;
    title?: string;
} | {
    type: 'confirm_request';
    actionId: string;
    toolName: string;
    description: string;
    params: Record<string, unknown>;
} | {
    type: 'error';
    message: string;
};
/** JSON Schema for tool parameters (simplified) */
export interface ToolParameterSchema {
    type: 'object';
    properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
    }>;
    required?: string[];
}
/** Definition of a Rezoo tool */
export interface ToolDefinition {
    name: string;
    description: string;
    category: 'system' | 'browser' | 'communication' | 'productivity' | 'files' | 'search' | 'memory';
    parameters: ToolParameterSchema;
    requiresConfirmation: boolean;
}
/** Result from executing a tool */
export interface ToolResult {
    success: boolean;
    message: string;
    data?: unknown;
}
/** A registered tool with its execute function */
export interface RegisteredTool extends ToolDefinition {
    execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}
export interface Contact {
    _id?: string;
    name: string;
    nicknames: string[];
    phone?: string;
    email?: string;
    whatsapp?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Memory {
    _id?: string;
    key: string;
    value: string;
    category: 'preference' | 'fact' | 'instruction';
    createdAt: Date;
    updatedAt: Date;
}
export interface ConversationEntry {
    _id?: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: Array<{
        name: string;
        args: Record<string, unknown>;
        result?: ToolResult;
    }>;
    timestamp: Date;
}
export interface RezooConfig {
    openaiApiKey: string;
    picovoiceAccessKey?: string;
    mongodbUri: string;
    port: number;
    ttsVoice: string;
}
//# sourceMappingURL=types.d.ts.map