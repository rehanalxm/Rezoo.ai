import React, { useState } from 'react';
import { FloatingOrb } from './components/FloatingOrb';
import { TranscriptPanel } from './components/TranscriptPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useAssistant } from './hooks/useAssistant';

export function App() {
  const {
    state,
    isListening,
    conversation,
    interimSpeech,
    toggleListening,
    clearChat,
    sendText,
    confirmAction,
    pendingConfirmation,
    hasPermission,
    requestMicPermission,
  } = useAssistant();

  const [isExpanded, setIsExpanded] = useState(true);

  const togglePanel = () => {
    setIsExpanded((prev) => !prev);
    if ((window as any).rezooAPI) {
      (window as any).rezooAPI.toggleExpand();
    }
  };

  const handleMinimize = () => {
    if ((window as any).rezooAPI?.minimizeWindow) {
      (window as any).rezooAPI.minimizeWindow();
    } else {
      togglePanel();
    }
  };

  const handleClose = () => {
    if ((window as any).rezooAPI?.closeWindow) {
      (window as any).rezooAPI.closeWindow();
    } else {
      setIsExpanded(false);
    }
  };

  const handleOrbClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      if ((window as any).rezooAPI) {
        (window as any).rezooAPI.toggleExpand();
      }
    }
    toggleListening();
  };

  return (
    <div className={`rezoo-app ${isExpanded ? 'mode-expanded' : 'mode-minimized'}`}>
      {/* Dynamic Background Ambient Gradients */}
      <div className="bg-glow-orb bg-glow-1"></div>
      <div className="bg-glow-orb bg-glow-2"></div>

      {isExpanded ? (
        <div className="assistant-card glass-panel">
          {/* Top Header Bar */}
          <div className="window-title-bar">
            <div className="title-bar-left">
              <div className="app-brand-pill">
                <span className="brand-dot"></span>
                <span className="brand-text">REZOO.AI</span>
              </div>
            </div>

            <div className="title-bar-center">
              <span className="header-status-pill">{state.toUpperCase()}</span>
            </div>

            <div className="title-bar-right">
              {conversation.length > 0 && (
                <button onClick={clearChat} className="header-icon-btn clear-btn" title="Clear Chat (🗑️)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              <button onClick={handleMinimize} className="header-icon-btn minimize-btn" title="Floating Ball Mode (−)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button onClick={handleClose} className="header-icon-btn close-btn" title="Exit Rezoo (✕)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Integrated Floating Orb Section */}
          <div className="card-top-section">
            <div className="header-orb-wrapper">
              <FloatingOrb
                state={state}
                onClick={handleOrbClick}
                onDoubleClick={togglePanel}
              />
            </div>
          </div>

          {/* Mic Permission Banner if needed (especially on mobile) */}
          {hasPermission === false && (
            <div className="permission-alert">
              <span>⚠️ Mic permission required on mobile</span>
              <button onClick={() => requestMicPermission()} className="grant-btn">
                Allow Mic 🎙️
              </button>
            </div>
          )}

          {/* Transcript & Message Body */}
          <TranscriptPanel
            conversation={conversation}
            interimSpeech={interimSpeech}
            onClose={togglePanel}
            onSendMessage={sendText}
            onToggleVoice={handleOrbClick}
            state={state}
            isListening={isListening}
          />
        </div>
      ) : (
        /* Floating Assistive Touch Ball (Always On Top Widget) */
        <div className="floating-assistive-ball" onClick={togglePanel} title="Rezoo.ai (Click to Open)">
          <div className={`assistive-halo assistive-halo-${state}`}>
            <div className="assistive-orb">
              <div className="assistive-core">
                <span className="assistive-brand">R</span>
              </div>
              <span className={`assistive-pulse-ring pulse-${state}`}></span>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {pendingConfirmation && (
        <ConfirmDialog
          confirmation={pendingConfirmation}
          onConfirm={() => confirmAction(true)}
          onCancel={() => confirmAction(false)}
        />
      )}
    </div>
  );
}
