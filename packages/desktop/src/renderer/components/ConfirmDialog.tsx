import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  confirmation: {
    toolName: string;
    description: string;
    parameters: any;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ confirmation, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onCancel();
    }, 30000); // 30s auto-dismiss
    return () => clearTimeout(timer);
  }, [onCancel]);

  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog glass-panel">
        <h4>Action Required</h4>
        <p><strong>{confirmation.toolName}</strong></p>
        <p className="desc">{confirmation.description}</p>
        <div className="params">
          <pre>{JSON.stringify(confirmation.parameters, null, 2)}</pre>
        </div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
