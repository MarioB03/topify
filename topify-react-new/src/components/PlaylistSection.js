import React from 'react';
import { useTopify } from '../context/TopifyContext';
import { useResponsive } from '../hooks/useResponsive';
import SongCard from './SongCard';
import Pagination from './Pagination';

const PlaylistSection = () => {
  const { state, dispatch, actionTypes, getSongsPerPage } = useTopify();
  const { isMobile } = useResponsive();
  
  const songsPerPage = getSongsPerPage();
  const sortedPlaylist = [...state.playlist].sort((a, b) => b.votes - a.votes);
  const startIndex = state.currentPage * songsPerPage;
  const endIndex = startIndex + songsPerPage;
  const currentPageSongs = sortedPlaylist.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedPlaylist.length / songsPerPage);

  const nextPage = () => {
    if (state.currentPage < totalPages - 1) {
      dispatch({ type: actionTypes.SET_CURRENT_PAGE, payload: state.currentPage + 1 });
    }
  };

  const previousPage = () => {
    if (state.currentPage > 0) {
      dispatch({ type: actionTypes.SET_CURRENT_PAGE, payload: state.currentPage - 1 });
    }
  };

  if (state.playlist.length === 0) {
    return (
      <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
        <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-4' : 'mb-6'}`}>
          🗳️ Lista de votaciones
        </h2>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-float">🎵</div>
            <p className="text-xl font-semibold mb-2 text-gradient">Tu playlist está vacía</p>
            <p className="text-lg text-gray-600">Busca y vota canciones para comenzar</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
      <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-4' : 'mb-6'}`}>
        🗳️ Lista de votaciones
      </h2>
      
      <div className="flex-1 flex flex-col">
        <div className="space-y-2 flex-1 overflow-y-auto">
          {currentPageSongs.map((song, index) => (
            <SongCard 
              key={song.id} 
              song={song} 
              showPosition={true} 
              position={startIndex + index + 1}
            />
          ))}
        </div>
        
        {totalPages > 1 && (
          <Pagination
            currentPage={state.currentPage}
            totalPages={totalPages}
            onNext={nextPage}
            onPrevious={previousPage}
          />
        )}
      </div>
    </section>
  );
};

export default PlaylistSection;