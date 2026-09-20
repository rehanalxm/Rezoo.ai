"use strict";
// ============================================================
// @rezoo/shared — Tool definitions for OpenAI function calling
// ============================================================
// Each tool is defined here for the shared schema.
// Actual execute() implementations live in packages/backend/src/tools/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITIONS = void 0;
exports.toOpenAITools = toOpenAITools;
/**
 * All available tool definitions.
 * These are converted to OpenAI function-calling format and sent to the LLM.
 */
exports.TOOL_DEFINITIONS = [
    // ----------------------------------------------------------
    // System Control
    // ----------------------------------------------------------
    {
        name: 'set_volume',
        description: 'Set or adjust the system volume. Can set an absolute value (0-100) or adjust relative to current (+10, -20).',
        category: 'system',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                level: { type: 'number', description: 'Absolute volume level 0-100. Omit to use relative adjustment.' },
                adjust: { type: 'number', description: 'Relative volume adjustment (-100 to +100). E.g. +10 to increase, -20 to decrease.' },
            },
        },
    },
    {
        name: 'open_application',
        description: 'Open an application or website by name. Examples: YouTube, Chrome, Spotify, Calculator, Notepad, Settings.',
        category: 'system',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the application or website to open' },
            },
            required: ['name'],
        },
    },
    {
        name: 'system_command',
        description: 'Execute a system action: lock screen, take screenshot, toggle mute, set brightness, shutdown, restart.',
        category: 'system',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'The system action to perform',
                    enum: ['lock', 'screenshot', 'mute', 'unmute', 'toggle_mute', 'brightness_up', 'brightness_down', 'shutdown', 'restart', 'sleep'],
                },
            },
            required: ['action'],
        },
    },
    // ----------------------------------------------------------
    // Browser Automation (Playwright)
    // ----------------------------------------------------------
    {
        name: 'browser_navigate',
        description: 'Open a URL in the browser or navigate to a website. Use for web browsing, opening specific pages.',
        category: 'browser',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to navigate to. Can be a full URL or a search query.' },
            },
            required: ['url'],
        },
    },
    {
        name: 'browser_interact',
        description: 'Interact with the current browser page: click elements, type text, scroll, take screenshot.',
        category: 'browser',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Browser interaction action',
                    enum: ['click', 'type', 'scroll', 'screenshot', 'get_text', 'go_back', 'go_forward', 'refresh'],
                },
                selector: { type: 'string', description: 'CSS selector or text to identify the element (for click/type)' },
                text: { type: 'string', description: 'Text to type (for type action)' },
                direction: { type: 'string', description: 'Scroll direction: up or down', enum: ['up', 'down'] },
            },
            required: ['action'],
        },
    },
    // ----------------------------------------------------------
    // Web Search
    // ----------------------------------------------------------
    {
        name: 'web_search',
        description: 'Search the web for information. Returns summarized results.',
        category: 'search',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
        },
    },
    // ----------------------------------------------------------
    // File Operations
    // ----------------------------------------------------------
    {
        name: 'file_operation',
        description: 'Perform file operations: read, create, list, move, or delete files and directories.',
        category: 'files',
        requiresConfirmation: true, // Always confirm destructive file ops
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'File operation to perform',
                    enum: ['read', 'create', 'list', 'move', 'delete'],
                },
                path: { type: 'string', description: 'File or directory path' },
                content: { type: 'string', description: 'Content to write (for create action)' },
                destination: { type: 'string', description: 'Destination path (for move action)' },
            },
            required: ['action', 'path'],
        },
    },
    // ----------------------------------------------------------
    // Memory
    // ----------------------------------------------------------
    {
        name: 'remember',
        description: 'Store information in memory for later recall. Use this when the user asks to remember something.',
        category: 'memory',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Short key/label for this memory (e.g., "sanu_phone", "favorite_color")' },
                value: { type: 'string', description: 'The information to remember' },
                category: { type: 'string', description: 'Category of memory', enum: ['preference', 'fact', 'instruction'] },
            },
            required: ['key', 'value'],
        },
    },
    {
        name: 'recall',
        description: 'Recall stored information from memory. Use when the user asks about something previously stored.',
        category: 'memory',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'What to search for in memory' },
            },
            required: ['query'],
        },
    },
    // ----------------------------------------------------------
    // Contacts
    // ----------------------------------------------------------
    {
        name: 'manage_contact',
        description: 'Add, update, find, or list contacts. Supports nickname-based lookup.',
        category: 'communication',
        requiresConfirmation: false,
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Contact action',
                    enum: ['add', 'update', 'find', 'list'],
                },
                name: { type: 'string', description: 'Contact name or nickname to find/add' },
                phone: { type: 'string', description: 'Phone number' },
                email: { type: 'string', description: 'Email address' },
                nickname: { type: 'string', description: 'Nickname for the contact' },
            },
            required: ['action'],
        },
    },
    // ----------------------------------------------------------
    // Messaging (Phase 2 - placeholder)
    // ----------------------------------------------------------
    {
        name: 'send_message',
        description: 'Send a message to a contact via WhatsApp, SMS, or email.',
        category: 'communication',
        requiresConfirmation: true,
        parameters: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Contact name, nickname, phone number, or email' },
                message: { type: 'string', description: 'Message content' },
                via: { type: 'string', description: 'Channel to send through', enum: ['whatsapp', 'sms', 'email'] },
            },
            required: ['to', 'message'],
        },
    },
];
/**
 * Convert our ToolDefinition to OpenAI function-calling format
 */
function toOpenAITools(tools) {
    return tools.map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}
//# sourceMappingURL=tools.js.map