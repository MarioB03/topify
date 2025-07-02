import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Allow fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgColor = {
    success: 'var(--color-sage-medium)',
    error: 'var(--color-rose-medium)', 
    info: 'var(--color-gold-medium)'
  };

  return (
    <div 
      className={`fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{
        background: `linear-gradient(135deg, ${bgColor[type]}, var(--color-sage-dark))`,
        border: '1px solid rgba(167, 182, 155, 0.3)'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {type === 'success' ? '🎉' : type === 'error' ? '⚠️' : 'ℹ️'}
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;