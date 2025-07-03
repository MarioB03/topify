import React from 'react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError,
  message = 'Ha ocurrido un error'
}) => {
  return (
    <div className="glass-effect rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      
      {error && process.env.NODE_ENV === 'development' && (
        <p className="text-sm text-gray-600 mb-4 font-mono">
          {error.message}
        </p>
      )}
      
      {resetError && (
        <button
          onClick={resetError}
          className="glass-button px-4 py-2 rounded-lg text-sm hover:scale-105 transition-transform"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
};

export default ErrorFallback;