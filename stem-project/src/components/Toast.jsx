import React, { useEffect } from 'react';

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 24,
      background: 'rgba(17,24,39,0.95)',
      color: '#fff',
      padding: '10px 16px',
      borderRadius: 8,
      zIndex: 9999,
      boxShadow: '0 6px 18px rgba(2,6,23,0.4)'
    }}>{message}</div>
  );
}
