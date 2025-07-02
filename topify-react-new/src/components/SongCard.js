import React from 'react';
import { useTopify } from '../context/TopifyContext';

const SongCard = ({ song, isSearchResult = false, showPosition = false, position = 0 }) => {
  const { state, dispatch, actionTypes, firestore, firestoreUtils, isReady } = useTopify();

  const consistentId = `${song.artist?.name || song.artist}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const hasVoted = state.votedSongs.includes(consistentId);

  const getMedal = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  const voteSong = async () => {
    if (!isReady || hasVoted) return;

    try {
      // Check if song exists in Firebase
      const { collection, getDocs, query, where, addDoc, updateDoc, doc } = firestoreUtils;
      const songQuery = query(
        collection(firestore, 'playlist'),
        where('id', '==', consistentId)
      );
      const querySnapshot = await getDocs(songQuery);

      let songData;
      if (!querySnapshot.empty) {
        // Song exists, update votes
        const docData = querySnapshot.docs[0];
        songData = { firebaseId: docData.id, ...docData.data() };
        songData.votes++;
        
        await updateDoc(doc(firestore, 'playlist', songData.firebaseId), {
          votes: songData.votes,
          updatedAt: new Date()
        });

        dispatch({ type: actionTypes.UPDATE_SONG_VOTES, payload: { id: consistentId, votes: songData.votes } });
      } else {
        // New song
        songData = {
          id: consistentId,
          title: song.title,
          artist: song.artist?.name || song.artist,
          cover: song.album?.cover_medium || song.cover,
          duration: song.duration,
          votes: 1,
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(firestore, 'playlist'), songData);
        songData.firebaseId = docRef.id;
        
        dispatch({ type: actionTypes.ADD_SONG_TO_PLAYLIST, payload: songData });
      }

      // Record the vote
      await addDoc(collection(firestore, 'votedSongs'), {
        songId: consistentId,
        userId: state.userFingerprint,
        timestamp: new Date()
      });

      dispatch({ type: actionTypes.ADD_VOTED_SONG, payload: consistentId });
      
      // Show toast notification
      showToast(songData.votes === 1 ? `🎵 ${song.title} añadida a la playlist!` : `👍 +1 voto para ${song.title}!`);
      
    } catch (error) {
      console.error('Error voting for song:', error);
    }
  };

  const removeVote = async () => {
    if (!isReady || !hasVoted) return;

    try {
      const { collection, getDocs, query, where, deleteDoc, doc, updateDoc } = firestoreUtils;
      
      // Find and remove vote
      const votedSongsQuery = query(
        collection(firestore, 'votedSongs'), 
        where('songId', '==', consistentId),
        where('userId', '==', state.userFingerprint)
      );
      const querySnapshot = await getDocs(votedSongsQuery);
      
      querySnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(firestore, 'votedSongs', docSnapshot.id));
      });

      // Update song votes
      const songInPlaylist = state.playlist.find(s => s.id === consistentId);
      if (songInPlaylist) {
        const newVotes = Math.max(0, songInPlaylist.votes - 1);
        
        if (newVotes === 0) {
          // Remove song from playlist
          await deleteDoc(doc(firestore, 'playlist', songInPlaylist.firebaseId));
          dispatch({ type: actionTypes.REMOVE_SONG_FROM_PLAYLIST, payload: consistentId });
        } else {
          // Update votes
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
    }
  };

  const togglePreview = (previewUrl) => {
    if (state.currentAudio && !state.currentAudio.paused) {
      state.currentAudio.pause();
      if (state.currentPlayingId === song.id) {
        dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio: null, id: null } });
        return;
      }
    }

    const audio = new Audio(previewUrl);
    audio.play().catch(error => console.error('Error playing audio:', error));
    
    audio.addEventListener('ended', () => {
      dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio: null, id: null } });
    });

    dispatch({ type: actionTypes.SET_CURRENT_AUDIO, payload: { audio, id: song.id } });
  };

  const showToast = (message) => {
    // Simple toast implementation - could be enhanced with a proper toast library
    console.log(message);
  };

  return (
    <div className={`${isSearchResult ? 'song-card' : 'playlist-item'} rounded-lg p-2 flex items-center gap-2 ${hasVoted && isSearchResult ? 'opacity-60' : ''}`}>
      {showPosition && (
        <div className="text-lg font-bold min-w-8 text-center text-gradient flex items-center justify-center">
          {typeof getMedal(position) === 'string' && getMedal(position).includes('🥇🥈🥉') ? (
            <span className="text-xl mr-1">{getMedal(position)}</span>
          ) : (
            getMedal(position)
          )}
        </div>
      )}
      
      <img 
        src={song.album?.cover_medium || song.cover} 
        alt={song.title} 
        className="w-10 h-10 rounded-md object-cover shadow-lg"
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate text-gray-800">{song.title}</div>
        <div className="truncate font-medium text-xs text-gray-600">
          {song.artist?.name || song.artist}
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
        
        {song.preview && isSearchResult && (
          <button 
            className="btn-audio text-white p-2 rounded-full shadow-lg" 
            onClick={() => togglePreview(song.preview)}
            title="Escuchar preview"
          >
            <span className="text-sm">
              {state.currentPlayingId === song.id ? '⏸️' : '🎵'}
            </span>
          </button>
        )}
        
        {isSearchResult ? (
          <button 
            className={`btn-secondary text-white px-4 py-2 rounded-lg font-medium shadow-lg ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={voteSong}
            disabled={hasVoted}
          >
            {hasVoted ? 'Votada' : 'Votar'}
          </button>
        ) : (
          <>
            {!hasVoted && (
              <button 
                className="btn-success text-white px-3 py-1 rounded-lg shadow-lg font-bold w-12" 
                onClick={voteSong}
                title="Votar por esta canción"
              >
                <span className="text-sm">+1</span>
              </button>
            )}
            {hasVoted && (
              <button 
                className="btn-danger text-white px-3 py-1 rounded-lg shadow-lg font-medium w-12" 
                onClick={removeVote}
                title="Quitar mi voto"
              >
                <span className="text-sm">-1</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SongCard;