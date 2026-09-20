import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { ClientMessage, ServerMessage } from '@rezoo/shared';
import { handleClientMessage } from './handlers.js';
import { ToolRegistry } from '../tools/registry.js';
import { AISession } from '../ai/session.js';
import { VoicePipeline } from '../voice/pipeline.js';

export interface ClientSession {
  id: string;
  ws: WebSocket;
  aiSession: AISession;
  voicePipeline: VoicePipeline;
  isAlive: boolean;
}

export class WebSocketGateway {
  private clients = new Map<string, ClientSession>();

  constructor(private wss: WebSocketServer, private toolRegistry: ToolRegistry) {
    this.setupWss();
    this.startHeartbeat();
  }

  private setupWss() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      console.log(`Client connected: ${clientId}`);

      // Create AI session with clientId for bidirectional communication
      const aiSession = new AISession(this.toolRegistry, this, clientId);
      const voicePipeline = new VoicePipeline(aiSession, this, clientId);

      // Wire up the voice pipeline to the AI session for TTS
      aiSession.setVoicePipeline(voicePipeline);

      const session: ClientSession = {
        id: clientId,
        ws,
        aiSession,
        voicePipeline,
        isAlive: true,
      };

      this.clients.set(clientId, session);

      // Send initial state
      this.sendMessage(clientId, { type: 'state_change', state: 'idle' });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await handleClientMessage(session, message, this);
        } catch (error) {
          console.error(`Failed to parse message from client ${clientId}:`, error);
        }
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) client.isAlive = true;
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for client ${clientId}:`, err.message);
      });
    });
  }

  private startHeartbeat() {
    setInterval(() => {
      for (const [id, session] of this.clients.entries()) {
        if (!session.isAlive) {
          console.log(`Client ${id} timed out, terminating.`);
          session.ws.terminate();
          this.handleDisconnect(id);
          continue;
        }
        session.isAlive = false;
        session.ws.ping();
      }
    }, 30000);
  }

  private handleDisconnect(clientId: string) {
    console.log(`Client disconnected: ${clientId}`);
    const session = this.clients.get(clientId);
    if (session) {
      session.voicePipeline.stop();
      this.clients.delete(clientId);
    }
  }

  public sendMessage(clientId: string, message: ServerMessage) {
    const session = this.clients.get(clientId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }

  /** Broadcast a message to all connected clients */
  public broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    for (const session of this.clients.values()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(data);
      }
    }
  }
}
