import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'white'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'white'
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: 'white'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'white'
        };
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 px-6 py-4 rounded-xl transform transition-all duration-300 z-50 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{
        ...getToastStyles(type),
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)',
        fontWeight: '600'
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