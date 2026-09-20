import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { envConfig } from './config/env.js';
import { WebSocketGateway } from './ws/gateway.js';
import { getMemoryStore } from './memory/store.js';
import { ToolRegistry } from './tools/registry.js';
import { registerSystemTools } from './tools/system.tool.js';
import { registerBrowserTools } from './tools/browser.tool.js';
import { registerSearchTools } from './tools/search.tool.js';
import { registerFileTools } from './tools/files.tool.js';
import { registerMemoryTools } from './tools/memory.tool.js';

async function bootstrap() {
  try {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const server = createServer(app);
    const wss = new WebSocketServer({ server });

    // Initialize Memory Store in background (non-blocking)
    const memoryStore = getMemoryStore();
    memoryStore.connect().catch(() => {});

    // Initialize Tool Registry
    const toolRegistry = new ToolRegistry();
    await registerSystemTools(toolRegistry);
    await registerBrowserTools(toolRegistry);
    await registerSearchTools(toolRegistry);
    await registerFileTools(toolRegistry);
    await registerMemoryTools(toolRegistry);

    console.log(`📦 Registered ${toolRegistry.getAll().length} tools`);

    // Initialize WebSocket Gateway
    const gateway = new WebSocketGateway(wss, toolRegistry);

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        tools: toolRegistry.getAll().length,
        provider: envConfig.provider,
        model: envConfig.model,
      });
    });

    server.listen(envConfig.port, () => {
      console.log(`
  ╔══════════════════════════════════════════╗
  ║         🤖 REZOO AI ASSISTANT            ║
  ║══════════════════════════════════════════║
  ║  Server:    http://localhost:${envConfig.port}        ║
  ║  WebSocket: ws://localhost:${envConfig.port}          ║
  ║  Provider:  ${envConfig.provider.toUpperCase()} (100% Free)      ║
  ║  Model:     ${envConfig.model} ║
  ║  Status:    READY & RUNNING              ║
  ╚══════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down Rezoo...');
      await memoryStore.close();
      server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start Rezoo backend:', error);
    process.exit(1);
  }
}

bootstrap();
