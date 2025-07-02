import React, { useState } from 'react';
import { TopifyProvider } from './context/TopifyContext';
import { useResponsive } from './hooks/useResponsive';
import SearchSection from './components/SearchSection';
import StatsSection from './components/StatsSection';
import PlaylistSection from './components/PlaylistSection';
import MyVotesSection from './components/MyVotesSection';
import Toast from './components/Toast';

const AppContent = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // const showToast = (message, type = 'success') => {
  //   setToast({ message, type });
  // };

  const closeToast = () => {
    setToast({ message: '', type: 'success' });
  };

  return (
    <div className="min-h-screen">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={closeToast} 
      />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-7xl w-full">
          {/* Mobile Layout - Single Column */}
          {isMobile && (
            <div className="space-y-4" style={{minHeight: 'calc(100vh - 2rem)'}}>
              {/* Search and Stats combined */}
              <div className="space-y-4">
                <SearchSection />
                <StatsSection />
              </div>
              
              {/* Voting Lists in tabs or accordion */}
              <div className="grid grid-cols-1 gap-4 flex-1">
                <PlaylistSection />
                <MyVotesSection />
              </div>
            </div>
          )}

          {/* Tablet Layout - Two Columns */}
          {isTablet && (
            <div className="grid grid-cols-2 gap-4" style={{height: 'calc(100vh - 2rem)'}}>
              {/* Left Column */}
              <div className="flex flex-col gap-4">
                <SearchSection />
                <StatsSection />
              </div>
              
              {/* Right Column - Combined Lists */}
              <div className="flex flex-col gap-4">
                <PlaylistSection />
                <MyVotesSection />
              </div>
            </div>
          )}

          {/* Desktop Layout - Three Columns */}
          {isDesktop && (
            <div className="grid grid-cols-3 gap-8" style={{height: 'calc(100vh - 2rem)'}}>
              {/* Left Column: Search and Stats */}
              <div className="flex flex-col gap-8">
                <SearchSection />
                <StatsSection />
              </div>

              {/* Center Column: Voting List */}
              <PlaylistSection />

              {/* Right Column: My Votes */}
              <MyVotesSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <TopifyProvider>
      <AppContent />
    </TopifyProvider>
  );
}

export default App;