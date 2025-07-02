import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'song' | 'stat';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'song' }) => {
  if (type === 'stat') {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-300 h-16 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="song-card rounded-lg p-2 flex items-center gap-2">
            {/* Position skeleton */}
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
            
            {/* Album cover skeleton */}
            <div className="w-10 h-10 bg-gray-300 rounded-md"></div>
            
            {/* Song info skeleton */}
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            
            {/* Vote button skeleton */}
            <div className="w-16 h-8 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;