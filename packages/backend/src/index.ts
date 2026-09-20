import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { envConfig } from './config/env.js';
import { WebSocketGateway } from './ws/gateway.js';
import { getMemoryStore } from './memory/store.js';
import { ToolRegistry } from './tools/registry.js';
import { registerSystemTools } from './tools/system.tool.js';
import { registerBrowserTools } from './tools/browser.tool.js';
import { registerSearchTools } from './tools/search.tool.js';
import { registerFileTools } from './tools/files.tool.js';
import { registerMemoryTools } from './tools/memory.tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Serve Static Web Frontend (Vite UI)
    const staticCandidates = [
      path.resolve(__dirname, '../public'),
      path.resolve(__dirname, '../../public'),
      path.resolve(__dirname, '../../desktop/dist/renderer'),
      path.resolve(__dirname, '../../../packages/desktop/dist/renderer'),
      path.resolve(__dirname, '../../../renderer'),
      path.resolve(__dirname, '../../../dist'),
      path.resolve(process.cwd(), 'packages/backend/public'),
      path.resolve(process.cwd(), 'public'),
      path.resolve(process.cwd(), 'packages/desktop/dist/renderer'),
      path.resolve(process.cwd(), 'dist/renderer'),
      path.resolve(process.cwd(), 'renderer'),
      path.resolve(process.cwd(), 'dist'),
    ];

    const publicDir = staticCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

    if (publicDir) {
      console.log(`🌐 Serving Web Frontend from: ${publicDir}`);
      app.use(express.static(publicDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
      });
    } else {
      app.get('/', (_req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><title>Rezoo AI Backend</title></head>
            <body style="background:#060913;color:#38bdf8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;">
              <h1>🤖 Rezoo AI Assistant Server is LIVE</h1>
              <p style="color:#94a3b8;">WebSocket & API Gateway active on this URL.</p>
            </body>
          </html>
        `);
      });
    }

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
