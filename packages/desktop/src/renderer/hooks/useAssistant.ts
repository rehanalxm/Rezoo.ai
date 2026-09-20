import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useVoice } from './useVoice';
import type { ServerMessage, RezooState } from '@rezoo/shared';

interface ConversationItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface PendingConfirmation {
  actionId: string;
  toolName: string;
  description: string;
  params: Record<string, unknown>;
}

export function useAssistant() {
  const [state, setState] = useState<RezooState>('idle');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  const voiceRef = useRef<ReturnType<typeof useVoice> | null>(null);

  const handleMessage = useCallback((data: any) => {
    const msg = data as ServerMessage;
    switch (msg.type) {
      case 'state_change':
        setState(msg.state);
        break;

      case 'transcript_partial':
        break;

      case 'transcript_final':
        setConversation((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].role === 'user' && prev[prev.length - 1].content.trim() === msg.text.trim()) {
            return prev;
          }
          return [
            ...prev,
            {
              role: 'user',
              content: msg.text,
              timestamp: new Date(),
            },
          ];
        });
        break;

      case 'response_text':
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: msg.text,
            timestamp: new Date(),
          },
        ]);
        voiceRef.current?.speakText(msg.text);
        break;

      case 'audio_playback':
        voiceRef.current?.playAudio(msg.data);
        break;

      case 'audio_playback_done':
        setState('idle');
        break;

      case 'stop_playback':
        voiceRef.current?.stopSpeaking();
        break;

      case 'tool_start':
        setCurrentTool(msg.toolName);
        break;

      case 'open_url':
        if (msg.url) {
          window.open(msg.url, '_blank');
        }
        break;

      case 'tool_result':
        setCurrentTool(null);
        if (msg.data && msg.data.url) {
          try {
            window.open(msg.data.url, '_blank');
          } catch {
            // Handled
          }
        }
        setConversation((prev) => [
          ...prev,
          {
            role: 'system',
            content: `${msg.toolName}: ${msg.message}`,
            timestamp: new Date(),
          },
        ]);
        break;

      case 'confirm_request':
        setPendingConfirmation({
          actionId: msg.actionId,
          toolName: msg.toolName,
          description: msg.description,
          params: msg.params,
        });
        break;

      case 'error':
        setConversation((prev) => [
          ...prev,
          {
            role: 'system',
            content: `Error: ${msg.message}`,
            timestamp: new Date(),
          },
        ]);
        setState('idle');
        break;
    }
  }, []);

  // Dynamically resolve WebSocket URL (supports localhost, IP, and HTTPS/WSS in cloud)
  const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:3001';
    const isHttps = window.location.protocol === 'https:';
    const protocol = isHttps ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';

    // Cloud hosting (Render/Vercel/etc. on standard port 80/443)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.') && !hostname.startsWith('10.')) {
      return `${protocol}//${window.location.host}`;
    }

    // Local development
    const port = window.location.port === '5173' ? '3001' : (window.location.port || '3001');
    return `${protocol}//${hostname}:${port}`;
  };

  const wsUrl = getWsUrl();

  const { isConnected, send } = useWebSocket(wsUrl, handleMessage);

  const cancelCurrent = useCallback(() => {
    send({ type: 'cancel_current' });
    voiceRef.current?.stopSpeaking();
    setState('idle');
  }, [send]);

  const [interimSpeech, setInterimSpeech] = useState<string>('');

  const sendText = useCallback(
    (text: string) => {
      // 🛑 Barge-in: cancel prior speech
      voiceRef.current?.stopSpeaking();
      cancelCurrent();
      setInterimSpeech('');

      send({ type: 'text_input', text });
      setConversation((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'user' && prev[prev.length - 1].content.trim() === text.trim()) {
          return prev;
        }
        return [
          ...prev,
          {
            role: 'user',
            content: text,
            timestamp: new Date(),
          },
        ];
      });
    },
    [send, cancelCurrent]
  );

  const WAKE_WORD_REGEX = /^(?:hey\s+rezoo|rezoo|hey\s+rizoo|rizoo|hey\s+razoo|hello\s+rezoo|sun\s+rezoo|ok\s+rezoo|okay\s+rezoo)[,\s]*/i;

  const voice = useVoice({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInterimSpeech('');
        const raw = text.trim();
        if (!raw) return;

        const isWakeMatch = WAKE_WORD_REGEX.test(raw);
        const cleanText = raw.replace(WAKE_WORD_REGEX, '').trim();

        if (isWakeMatch && cleanText.length === 0) {
          // User only said "Hey Rezoo"
          voiceRef.current?.speakText("Yes, I'm listening!");
          setState('listening');
          return;
        }

        const cmd = cleanText || raw;
        if (cmd.length > 0) {
          sendText(cmd);
        }
      } else {
        setInterimSpeech(text);
      }
    },
    onWakeWord: () => {
      voiceRef.current?.start();
      setState('listening');
    },
    onUserInterrupted: () => {
      cancelCurrent();
    },
  });
  voiceRef.current = voice;

  // Auto-start continuous listening if mic permission was granted
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('rezoo_mic_granted') === 'true') {
      voice.start();
    }
  }, []);

  const clearChat = useCallback(() => {
    setConversation([]);
    setInterimSpeech('');
  }, []);

  const startListening = useCallback(async () => {
    await voice.start();
    send({ type: 'start_listening' });
    setState('listening');
  }, [voice, send]);

  const stopListening = useCallback(() => {
    voice.stop();
    send({ type: 'stop_listening' });
    setState('idle');
  }, [voice, send]);

  const toggleListening = useCallback(() => {
    if (state === 'listening' || voice.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state, voice.isListening, startListening, stopListening]);

  const confirmAction = useCallback(
    (confirmed: boolean) => {
      if (pendingConfirmation) {
        send({
          type: 'confirm_action',
          actionId: pendingConfirmation.actionId,
          confirmed,
        });
        setPendingConfirmation(null);
      }
    },
    [pendingConfirmation, send]
  );

  // Sync voice state with assistant state
  useEffect(() => {
    if (voice.isListening && state === 'idle') {
      setState('listening');
    } else if (!voice.isListening && state === 'listening') {
      setState('idle');
    }
  }, [voice.isListening, state]);

  useEffect(() => {
    if (voice.isSpeaking && state !== 'executing') {
      setState('speaking');
    }
  }, [voice.isSpeaking, state]);

  useEffect(() => {
    if ((window as any).rezooAPI) {
      (window as any).rezooAPI.onToggleListening(() => {
        if (state === 'idle') {
          startListening();
        } else if (state === 'listening') {
          stopListening();
        } else {
          cancelCurrent();
          startListening();
        }
      });
    }
  }, [state, startListening, stopListening, cancelCurrent]);

  return {
    state,
    isListening: state === 'listening' || voice.isListening,
    conversation,
    interimSpeech,
    startListening,
    stopListening,
    toggleListening,
    clearChat,
    sendText,
    confirmAction,
    cancelCurrent,
    isConnected,
    pendingConfirmation,
    currentTool,
    hasPermission: voice.hasPermission,
    requestMicPermission: voice.requestPermission,
  };
}
