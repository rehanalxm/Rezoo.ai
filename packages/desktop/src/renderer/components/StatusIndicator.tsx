import React from 'react';

interface StatusIndicatorProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'listening':
        return { label: 'LISTENING...', color: '#10b981', pulse: true, icon: '🎙️' };
      case 'thinking':
        return { label: 'THINKING...', color: '#8b5cf6', pulse: true, icon: '⚡' };
      case 'speaking':
        return { label: 'SPEAKING...', color: '#ec4899', pulse: true, icon: '🔊' };
      case 'executing':
        return { label: 'EXECUTING...', color: '#f59e0b', pulse: true, icon: '⚙️' };
      default:
        return { label: 'READY', color: '#38bdf8', pulse: false, icon: '✨' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="status-badge" style={{ borderColor: `${config.color}40` }}>
      <span
        className={`status-dot ${config.pulse ? 'status-dot-pulse' : ''}`}
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
      ></span>
      <span className="status-label" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}
