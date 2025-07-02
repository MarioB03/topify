import React from 'react';
import { useTopify } from '../context/TopifyContext';
import { useResponsive } from '../hooks/useResponsive';
import SongCard from './SongCard';
import Pagination from './Pagination';
import LoadingSkeleton from './LoadingSkeleton';

const MyVotesSection: React.FC = () => {
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

  const getGlobalPosition = (songId: string) => {
    const sortedPlaylist = [...state.playlist].sort((a, b) => b.votes - a.votes);
    return sortedPlaylist.findIndex(s => s.id === songId) + 1;
  };

  if (state.votedSongs.length === 0 && !state.isLoadingVotes) {
    return (
      <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
            ❤️ Mis votos
          </h2>
          <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            {state.votedSongs.length} voto{state.votedSongs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-float">💭</div>
            <p className="text-xl font-semibold mb-2 text-gradient">No has votado aún</p>
            <p className="text-lg text-gray-600">Busca y vota por tus canciones favoritas</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
          ❤️ Mis votos
        </h2>
        <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-bold">
          {state.votedSongs.length} voto{state.votedSongs.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="space-y-1 flex-1 overflow-y-auto">
          {state.isLoadingVotes ? (
            <LoadingSkeleton count={getSongsPerPage()} type="song" />
          ) : (
            currentPageVotes.map((song) => (
              <SongCard 
                key={song.id} 
                song={song} 
                showPosition={true} 
                position={getGlobalPosition(song.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={state.myVotesPage}
            totalPages={totalPages}
            onNext={nextPage}
            onPrevious={previousPage}
          />
        </div>
      )}
    </section>
  );
};

export default MyVotesSection;