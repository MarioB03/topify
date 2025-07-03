import React, { useState } from 'react';
import Image from 'next/image';
import { useTopify } from '../context/TopifyContext';
import { validateAndSanitizeSong, validateFirebaseData } from '../utils/validation';
import { checkForDuplicates } from '../utils/songUtils';

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
  const { state, dispatch, actionTypes, firestore, firestoreUtils, isReady, deviceTracker } = useTopify();
  const [isVoting, setIsVoting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const artistName = typeof song.artist === 'string' ? song.artist : song.artist?.name;
  const consistentId = `${artistName}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const hasVoted = state.votedSongs.includes(consistentId);

  const getMedal = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  const voteSong = async () => {
    if (!isReady || hasVoted || isVoting) return;

    // Verificar con el device tracker
    if (deviceTracker) {
      const canVoteResult = deviceTracker.canVote(consistentId);
      if (!canVoteResult.allowed) {
        showToast(canVoteResult.reason || 'No puedes votar en este momento', 'error');
        return;
      }
    }

    // Verificar duplicados antes de añadir
    if (isSearchResult) {
      const duplicateCheck = checkForDuplicates(
        { artist: artistName || '', title: song.title },
        state.playlist
      );
      
      if (duplicateCheck.isDuplicate) {
        showToast(duplicateCheck.reason || 'Esta canción ya está en la playlist', 'error');
        return;
      }
    }

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
        // Preparar datos para nueva canción
        const newSongData = {
          id: consistentId,
          title: song.title,
          artist: typeof song.artist === 'string' ? { name: song.artist } : song.artist,
          album: {
            cover_medium: song.album?.cover_medium || song.cover || 'https://via.placeholder.com/250x250?text=🎵',
            cover_small: song.album?.cover_small || 'https://via.placeholder.com/60x60?text=🎵'
          },
          duration: song.duration,
          preview: song.preview || null,
          votes: 0 // Iniciará en 0, Firebase rules lo validará
        };

        // Validar y sanitizar antes de enviar a Firebase
        const validatedSong = validateAndSanitizeSong(newSongData);
        if (!validatedSong) {
          throw new Error('Datos de canción inválidos');
        }

        // Preparar datos para Firebase
        songData = {
          ...validatedSong,
          artist: validatedSong.artist.name, // Firebase espera string, no objeto
          cover: validatedSong.album?.cover_medium,
          votes: 1, // Ahora sí ponemos 1 voto
          createdAt: new Date()
        };

        // Validar estructura antes de enviar
        if (!validateFirebaseData(songData)) {
          throw new Error('Estructura de datos inválida para Firebase');
        }

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
      
      // Registrar voto en device tracker
      if (deviceTracker) {
        deviceTracker.recordVote(consistentId);
      }
      
      showToast(songData.votes === 1 ? `🎵 ${song.title} añadida a la playlist!` : `👍 +1 voto para ${song.title}!`);
      
    } catch (error) {
      console.error('Error voting for song:', error);
      if (error instanceof Error) {
        showToast(`Error: ${error.message}`, 'error');
      } else {
        showToast('Error al votar. Por favor intenta de nuevo.', 'error');
      }
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
      
      // Actualizar device tracker
      if (deviceTracker) {
        deviceTracker.removeVote(consistentId);
      }
      
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Create a custom event to show toast
    const event = new CustomEvent('showToast', { 
      detail: { message, type } 
    });
    window.dispatchEvent(event);
  };

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