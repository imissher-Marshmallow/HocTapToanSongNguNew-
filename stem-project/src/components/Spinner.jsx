import React from 'react';

export default function Spinner({ size = 20, color = '#fff' }) {
  const s = size;
  const style = {
    width: s,
    height: s,
    borderRadius: '50%',
    border: `${Math.max(2, Math.floor(s / 6))}px solid rgba(255,255,255,0.2)`,
    borderTopColor: color,
    animation: 'spin 1s linear infinite'
  };
  return (
    <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
