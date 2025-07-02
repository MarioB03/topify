import React from 'react';

const Pagination = ({ currentPage, totalPages, onNext, onPrevious }) => {
  return (
    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
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