import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onNext, 
  onPrevious 
}) => {
  return (
    <div className="flex justify-between items-center">
      <button 
        onClick={onPrevious}
        className={`btn-secondary px-3 py-1 rounded-md text-white text-sm font-medium ${
          currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={currentPage === 0}
      >
        ← Anterior
      </button>
      
      <div className="text-xs text-gray-600">
        Página {currentPage + 1} de {totalPages}
      </div>
      
      <button 
        onClick={onNext}
        className={`btn-secondary px-3 py-1 rounded-md text-white text-sm font-medium ${
          currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={currentPage === totalPages - 1}
      >
        Siguiente →
      </button>
    </div>
  );
};

export default Pagination;