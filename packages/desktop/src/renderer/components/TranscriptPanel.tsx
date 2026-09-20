import React, { useRef, useEffect, useState } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TranscriptPanelProps {
  conversation: Message[];
  interimSpeech?: string;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
  onToggleVoice?: () => void;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
  isListening?: boolean;
}

export function TranscriptPanel({ conversation, interimSpeech, onClose, onSendMessage, onToggleVoice, state, isListening }: TranscriptPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, interimSpeech, state]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleQuickCommand = (cmd: string) => {
    if (onSendMessage) {
      onSendMessage(cmd);
    }
  };

  const micActive = isListening || state === 'listening';

  return (
    <div className="transcript-panel">
      {/* Conversation Message List */}
      <div className="transcript-body">
        {conversation.length === 0 && !interimSpeech && (
          <div className="empty-state">
            <div className="empty-orb-icon">✨</div>
            <h4>Rezoo Action Assistant</h4>
            <p>Speak any voice command or tap an action below:</p>
            <div className="prompt-cards">
              <div className="prompt-card" onClick={() => handleQuickCommand('Play Tere Naam on YouTube')}>
                <span className="p-icon">🎵</span>
                <span className="p-text">"Play Tere Naam on YouTube"</span>
              </div>
              <div className="prompt-card" onClick={() => handleQuickCommand('Set volume to 80%')}>
                <span className="p-icon">🔊</span>
                <span className="p-text">"Set volume to 80%"</span>
              </div>
              <div className="prompt-card" onClick={() => handleQuickCommand('Search latest tech news')}>
                <span className="p-icon">🌐</span>
                <span className="p-text">"Search latest tech news"</span>
              </div>
              <div className="prompt-card" onClick={() => handleQuickCommand('Open Calculator')}>
                <span className="p-icon">🧮</span>
                <span className="p-text">"Open Calculator"</span>
              </div>
              <div className="prompt-card" onClick={() => handleQuickCommand('Lock screen')}>
                <span className="p-icon">🔒</span>
                <span className="p-text">"Lock PC Screen"</span>
              </div>
            </div>
          </div>
        )}

        {conversation.map((msg, i) => (
          <div key={i} className={`msg-row msg-row-${msg.role}`}>
            <div className={`msg-bubble msg-bubble-${msg.role}`}>
              {msg.role === 'assistant' && <div className="msg-author">Rezoo</div>}
              {msg.role === 'user' && <div className="msg-author">You</div>}
              <div className="msg-text">{msg.content}</div>
            </div>
          </div>
        ))}

        {interimSpeech && (
          <div className="msg-row msg-row-user">
            <div className="msg-bubble msg-bubble-user live-transcript-bubble">
              <div className="msg-author">Listening... 🎙️</div>
              <div className="msg-text">{interimSpeech}</div>
            </div>
          </div>
        )}

        {state === 'thinking' && (
          <div className="msg-row msg-row-assistant">
            <div className="msg-bubble msg-bubble-thinking">
              <span className="thinking-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Bottom Floating Glass Input Form */}
      <form onSubmit={handleSend} className="transcript-input-form">
        <button
          type="button"
          onClick={onToggleVoice}
          className={`mic-toggle-btn ${micActive ? 'is-active-mic' : ''}`}
          title={micActive ? 'Listening... (Click to stop)' : 'Click to speak (Microphone)'}
        >
          {micActive ? '🔴' : '🎙️'}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command Rezoo or ask anything..."
          className="transcript-input"
        />
        <button type="submit" className="transcript-send-btn" title="Send Command">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
