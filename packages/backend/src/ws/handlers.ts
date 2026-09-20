import type { ClientMessage } from '@rezoo/shared';
import type { ClientSession, WebSocketGateway } from './gateway.js';

export async function handleClientMessage(
  session: ClientSession,
  message: ClientMessage,
  gateway: WebSocketGateway
): Promise<void> {
  try {
    switch (message.type) {
      case 'audio_chunk':
        session.voicePipeline.receiveAudio(message.data);
        break;

      case 'start_listening':
        session.voicePipeline.startListening();
        gateway.sendMessage(session.id, { type: 'state_change', state: 'listening' });
        break;

      case 'stop_listening':
        session.voicePipeline.stopListening();
        gateway.sendMessage(session.id, { type: 'state_change', state: 'idle' });
        break;

      case 'cancel_current':
        session.voicePipeline.bargeIn();
        break;

      case 'confirm_action':
        session.aiSession.resolveConfirmation(message.actionId, message.confirmed);
        break;

      case 'text_input':
        await session.aiSession.handleTextInput(message.text);
        break;

      case 'wake_word_detected':
        session.voicePipeline.startListening();
        gateway.sendMessage(session.id, { type: 'state_change', state: 'listening' });
        break;

      default:
        console.warn(`Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    console.error(`Error handling message for session ${session.id}:`, error);
    gateway.sendMessage(session.id, { type: 'error', message: 'Internal error processing your request.' });
  }
}
