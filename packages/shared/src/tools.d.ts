import type { ToolDefinition } from './types.js';
/**
 * All available tool definitions.
 * These are converted to OpenAI function-calling format and sent to the LLM.
 */
export declare const TOOL_DEFINITIONS: ToolDefinition[];
/**
 * Convert our ToolDefinition to OpenAI function-calling format
 */
export declare function toOpenAITools(tools: ToolDefinition[]): {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: import("./types.js").ToolParameterSchema;
    };
}[];
//# sourceMappingURL=tools.d.ts.map