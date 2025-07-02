import React, { useState } from 'react';
import Image from 'next/image';
import { useTopify } from '../context/TopifyContext';

interface Song {
  id: string;
  title: string;
  artist: {
    name: string;
  } | string;
  album?: {
    cover_medium: string;
    cover_small?: string;
  };
  cover?: string;
  duration: number;
  preview?: string | null;
  votes: number;
  firebaseId?: string;
}

interface SongCardProps {
  song: Song;
  isSearchResult?: boolean;
  showPosition?: boolean;
  position?: number;
}

const SongCard: React.FC<SongCardProps> = ({ 
  song, 
  isSearchResult = false, 
  showPosition = false, 
  position = 0 
}) => {
  const { state, dispatch, actionTypes, firestore, firestoreUtils, isReady } = useTopify();
  const [isVoting, setIsVoting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const consistentId = `${typeof song.artist === 'string' ? song.artist : song.artist?.name || song.artist}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const hasVoted = state.votedSongs.includes(consistentId);

  const getMedal = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  const voteSong = async () => {
    if (!isReady || hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      const { collection, getDocs, query, where, addDoc, updateDoc, doc } = firestoreUtils as any;
      const songQuery = query(
        collection(firestore, 'playlist'),
        where('id', '==', consistentId)
      );
      const querySnapshot = await getDocs(songQuery);

      let songData: { firebaseId?: string; votes: number; [key: string]: unknown };
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0];
        const data = docData.data() as { votes: number; [key: string]: unknown };
        songData = { firebaseId: docData.id, ...data };
        songData.votes++;
        
        await updateDoc(doc(firestore, 'playlist', songData.firebaseId), {
          votes: songData.votes,
          updatedAt: new Date()
        });

        dispatch({ type: actionTypes.UPDATE_SONG_VOTES, payload: { id: consistentId, votes: songData.votes } });
      } else {
        songData = {
          id: consistentId,
          title: song.title,
          artist: typeof song.artist === 'string' ? song.artist : song.artist?.name,
          cover: song.album?.cover_medium || song.cover,
          duration: song.duration,
          preview: song.preview || null,
          votes: 1,
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(firestore, 'playlist'), songData);
        songData.firebaseId = docRef.id;
        
        dispatch({ type: actionTypes.ADD_SONG_TO_PLAYLIST, payload: songData });
      }

      await addDoc(collection(firestore, 'votedSongs'), {
        songId: consistentId,
        userId: state.userFingerprint,
        timestamp: new Date()
      });

      dispatch({ type: actionTypes.ADD_VOTED_SONG, payload: consistentId });
      
      showToast(songData.votes === 1 ? `🎵 ${song.title} añadida a la playlist!` : `👍 +1 voto para ${song.title}!`);
      
    } catch (error) {
      console.error('Error voting for song:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const removeVote = async () => {
    if (!isReady || !hasVoted || isRemoving) return;

    setIsRemoving(true);
    try {
      const { collection, getDocs, query, where, deleteDoc, doc, updateDoc } = firestoreUtils as any;
      
      const votedSongsQuery = query(
        collection(firestore, 'votedSongs'), 
        where('songId', '==', consistentId),
        where('userId', '==', state.userFingerprint)
      );
      const querySnapshot = await getDocs(votedSongsQuery);
      
      querySnapshot.forEach(async (docSnapshot: { id: string }) => {
        await deleteDoc(doc(firestore, 'votedSongs', docSnapshot.id));
      });

      const songInPlaylist = state.playlist.find(s => s.id === consistentId);
      if (songInPlaylist) {
        const newVotes = Math.max(0, songInPlaylist.votes - 1);
        
        if (newVotes === 0) {
          await deleteDoc(doc(firestore, 'playlist', songInPlaylist.firebaseId));
          dispatch({ type: actionTypes.REMOVE_SONG_FROM_PLAYLIST, payload: consistentId });
        } else {
          await updateDoc(doc(firestore, 'playlist', songInPlaylist.firebaseId), {
            votes: newVotes,
            updatedAt: new Date()
          });
          dispatch({ type: actionTypes.UPDATE_SONG_VOTES, payload: { id: consistentId, votes: newVotes } });
        }
      }

      dispatch({ type: actionTypes.REMOVE_VOTED_SONG, payload: consistentId });
      showToast(`↩️ Voto retirado de ${song.title}`);
      
    } catch (error) {
      console.error('Error removing vote:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const togglePreview = (previewUrl: string) => {
    if (state.currentAudio && !state.currentAudio.paused) {
      state.currentAudio.pause();
      if (state.currentPlayingId === song.id) {
        dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio: null, id: null } });
        return;
      }
    }

    const audio = new Audio(previewUrl);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => console.error('Error playing audio:', error));
    
    audio.addEventListener('ended', () => {
      dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio: null, id: null } });
    });

    dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio, id: song.id } });
  };

  const showToast = (message: string) => {
    // Create a custom event to show toast
    const event = new CustomEvent('showToast', { 
      detail: { message, type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  const artistName = typeof song.artist === 'string' ? song.artist : song.artist?.name;

  return (
    <div className={`${isSearchResult ? 'song-card' : 'playlist-item'} rounded-lg p-1.5 flex items-center gap-2 min-h-[56px] ${hasVoted && isSearchResult ? 'opacity-60' : ''}`}>
      {showPosition && (
        <div className="text-lg font-bold min-w-8 text-center text-gradient flex items-center justify-center">
          {typeof getMedal(position) === 'string' && getMedal(position).includes('🥇🥈🥉') ? (
            <span className="text-xl mr-1">{getMedal(position)}</span>
          ) : (
            getMedal(position)
          )}
        </div>
      )}
      
      <Image 
        src={song.album?.cover_medium || song.cover || '/placeholder.svg'} 
        alt={song.title} 
        width={40}
        height={40}
        className="rounded-md object-cover shadow-lg flex-shrink-0 w-[40px] h-[40px]"
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate text-gray-800">{song.title}</div>
        <div className="truncate font-medium text-xs text-gray-700">
          {artistName}
        </div>
        {hasVoted && isSearchResult && (
          <div className="text-xs text-orange-400">✓ Ya votada</div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {!isSearchResult && (
          <div className="btn-secondary text-white px-3 py-1 rounded-lg font-bold shadow-lg">
            {song.votes}
          </div>
        )}
        
        {song.preview && (
          <button 
            className="btn-audio text-white p-2 rounded-full shadow-lg" 
            onClick={() => togglePreview(song.preview!)}
            title="Escuchar preview"
          >
            <span className="text-sm">
              {state.currentPlayingId === song.id ? '⏸️' : '🎵'}
            </span>
          </button>
        )}
        
        {isSearchResult ? (
          <button 
            className={`btn-secondary text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
              hasVoted || isVoting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            onClick={voteSong}
            disabled={hasVoted || isVoting}
          >
            {isVoting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Votando...</span>
              </div>
            ) : hasVoted ? 'Votada' : 'Votar'}
          </button>
        ) : (
          <>
            {!hasVoted && (
              <button 
                className={`btn-success text-white px-3 py-1 rounded-lg shadow-lg font-bold w-12 transition-all ${
                  isVoting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                onClick={voteSong}
                disabled={isVoting}
                title="Votar por esta canción"
              >
                {isVoting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  <span className="text-sm">+1</span>
                )}
              </button>
            )}
            {hasVoted && (
              <button 
                className={`btn-danger text-white px-3 py-1 rounded-lg shadow-lg font-medium w-12 transition-all ${
                  isRemoving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                onClick={removeVote}
                disabled={isRemoving}
                title="Quitar mi voto"
              >
                {isRemoving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  <span className="text-sm">-1</span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SongCard;