import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | null;
  isError: boolean;
}

interface UseErrorHandlerReturn {
  error: Error | null;
  isError: boolean;
  setError: (error: Error | null) => void;
  resetError: () => void;
  handleError: (error: unknown) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false
  });

  const setError = useCallback((error: Error | null) => {
    setErrorState({
      error,
      isError: error !== null
    });
  }, []);

  const resetError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error('Error capturado:', error);
    
    if (error instanceof Error) {
      setError(error);
    } else if (typeof error === 'string') {
      setError(new Error(error));
    } else {
      setError(new Error('Ha ocurrido un error desconocido'));
    }
    
    // Mostrar toast de error
    const event = new CustomEvent('showToast', {
      detail: {
        message: error instanceof Error ? error.message : 'Ha ocurrido un error',
        type: 'error'
      }
    });
    window.dispatchEvent(event);
  }, [setError]);

  return {
    error: errorState.error,
    isError: errorState.isError,
    setError,
    resetError,
    handleError
  };
};

// Hook para envolver operaciones async con manejo de errores
export const useAsyncError = () => {
  const { handleError } = useErrorHandler();

  return useCallback((error: unknown) => {
    handleError(error);
  }, [handleError]);
};