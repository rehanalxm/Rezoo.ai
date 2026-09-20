import React from 'react';
import { StatusIndicator } from './StatusIndicator';

interface FloatingOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
  onClick: () => void;
  onDoubleClick: () => void;
}

export function FloatingOrb({ state, onClick, onDoubleClick }: FloatingOrbProps) {
  return (
    <div className="orb-wrapper" onDoubleClick={onDoubleClick}>
      <div className={`orb-halo orb-halo-${state}`}>
        <div className={`orb orb-${state}`} onClick={onClick} title="Click to speak">
          <div className="orb-core">
            <div className="orb-gradient-layer"></div>
            <div className="orb-shine"></div>
          </div>

          {state === 'speaking' && (
            <div className="wavebars-container">
              <span className="wave-bar b1"></span>
              <span className="wave-bar b2"></span>
              <span className="wave-bar b3"></span>
              <span className="wave-bar b4"></span>
              <span className="wave-bar b5"></span>
            </div>
          )}

          {state === 'listening' && (
            <div className="listening-rings">
              <div className="l-ring r1"></div>
              <div className="l-ring r2"></div>
            </div>
          )}

          {state === 'thinking' && (
            <div className="orbit-spinner">
              <div className="orbit-dot d1"></div>
              <div className="orbit-dot d2"></div>
              <div className="orbit-dot d3"></div>
            </div>
          )}
        </div>
      </div>
      <StatusIndicator state={state} />
    </div>
  );
}
