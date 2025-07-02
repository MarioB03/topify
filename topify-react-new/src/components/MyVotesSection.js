import React from 'react';
import { useTopify } from '../context/TopifyContext';
import { useResponsive } from '../hooks/useResponsive';
import SongCard from './SongCard';
import Pagination from './Pagination';

const MyVotesSection = () => {
  const { state, dispatch, actionTypes, getSongsPerPage } = useTopify();
  const { isMobile } = useResponsive();
  
  const songsPerPage = getSongsPerPage();
  const myVotedSongs = state.playlist.filter(song => 
    state.votedSongs.includes(song.id)
  ).sort((a, b) => b.votes - a.votes);
  
  const startIndex = state.myVotesPage * songsPerPage;
  const endIndex = startIndex + songsPerPage;
  const currentPageVotes = myVotedSongs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(myVotedSongs.length / songsPerPage);

  const nextPage = () => {
    if (state.myVotesPage < totalPages - 1) {
      dispatch({ type: actionTypes.SET_MY_VOTES_PAGE, payload: state.myVotesPage + 1 });
    }
  };

  const previousPage = () => {
    if (state.myVotesPage > 0) {
      dispatch({ type: actionTypes.SET_MY_VOTES_PAGE, payload: state.myVotesPage - 1 });
    }
  };

  // Get global position for each song
  const getGlobalPosition = (songId) => {
    const sortedPlaylist = [...state.playlist].sort((a, b) => b.votes - a.votes);
    return sortedPlaylist.findIndex(s => s.id === songId) + 1;
  };

  if (state.votedSongs.length === 0) {
    return (
      <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
        <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-4' : 'mb-6'}`}>
          ❤️ Mis votos
        </h2>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-float">💭</div>
            <p className="text-xl font-semibold mb-2 text-gradient">No has votado aún</p>
            <p className="text-lg text-gray-600">Busca y vota por tus canciones favoritas</p>
          </div>
        </div>
        <div className="text-center text-sm text-gray-600">
          0 votos
        </div>
      </section>
    );
  }

  return (
    <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
      <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-4' : 'mb-6'}`}>
        ❤️ Mis votos
      </h2>
      
      <div className="flex-1 flex flex-col">
        <div className="space-y-2 flex-1 overflow-y-auto">
          {currentPageVotes.map((song) => (
            <SongCard 
              key={song.id} 
              song={song} 
              showPosition={true} 
              position={getGlobalPosition(song.id)}
            />
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-600 flex-shrink-0">
          {totalPages > 1 && (
            <div className="mb-2">
              <Pagination
                currentPage={state.myVotesPage}
                totalPages={totalPages}
                onNext={nextPage}
                onPrevious={previousPage}
              />
            </div>
          )}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              {state.votedSongs.length} voto{state.votedSongs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyVotesSection;