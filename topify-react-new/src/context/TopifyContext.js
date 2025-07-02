import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { useResponsive } from '../hooks/useResponsive';

const TopifyContext = createContext();

// Generate user fingerprint
const generateUserFingerprint = () => {
  let fingerprint = localStorage.getItem('topify-user-id');
  
  if (!fingerprint) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Topify fingerprint', 2, 2);
    
    const browserInfo = [
      navigator.userAgent,
      navigator.language,
      window.screen.width + 'x' + window.screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < browserInfo.length; i++) {
      const char = browserInfo.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    fingerprint = 'user_' + Math.abs(hash) + '_' + Date.now();
    localStorage.setItem('topify-user-id', fingerprint);
  }
  
  return fingerprint;
};

// Initial state
const initialState = {
  playlist: [],
  votedSongs: [],
  searchResults: [],
  currentPage: 0,
  myVotesPage: 0,
  isSearching: false,
  currentAudio: null,
  currentPlayingId: null,
  userFingerprint: generateUserFingerprint(),
  stats: {
    totalSongs: 0,
    totalVotes: 0
  }
};

// Action types
const actionTypes = {
  SET_PLAYLIST: 'SET_PLAYLIST',
  SET_VOTED_SONGS: 'SET_VOTED_SONGS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_MY_VOTES_PAGE: 'SET_MY_VOTES_PAGE',
  SET_IS_SEARCHING: 'SET_IS_SEARCHING',
  SET_CURRENT_AUDIO: 'SET_CURRENT_AUDIO',
  ADD_SONG_TO_PLAYLIST: 'ADD_SONG_TO_PLAYLIST',
  UPDATE_SONG_VOTES: 'UPDATE_SONG_VOTES',
  REMOVE_SONG_FROM_PLAYLIST: 'REMOVE_SONG_FROM_PLAYLIST',
  ADD_VOTED_SONG: 'ADD_VOTED_SONG',
  REMOVE_VOTED_SONG: 'REMOVE_VOTED_SONG',
  UPDATE_STATS: 'UPDATE_STATS'
};

// Reducer
const topifyReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_PLAYLIST:
      return { ...state, playlist: action.payload };
    case actionTypes.SET_VOTED_SONGS:
      return { ...state, votedSongs: action.payload };
    case actionTypes.SET_SEARCH_RESULTS:
      return { ...state, searchResults: action.payload };
    case actionTypes.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };
    case actionTypes.SET_MY_VOTES_PAGE:
      return { ...state, myVotesPage: action.payload };
    case actionTypes.SET_IS_SEARCHING:
      return { ...state, isSearching: action.payload };
    case actionTypes.SET_CURRENT_AUDIO:
      return { 
        ...state, 
        currentAudio: action.payload.audio,
        currentPlayingId: action.payload.id
      };
    case actionTypes.ADD_SONG_TO_PLAYLIST:
      return { 
        ...state, 
        playlist: [...state.playlist, action.payload] 
      };
    case actionTypes.UPDATE_SONG_VOTES:
      return {
        ...state,
        playlist: state.playlist.map(song =>
          song.id === action.payload.id
            ? { ...song, votes: action.payload.votes }
            : song
        )
      };
    case actionTypes.REMOVE_SONG_FROM_PLAYLIST:
      return {
        ...state,
        playlist: state.playlist.filter(song => song.id !== action.payload)
      };
    case actionTypes.ADD_VOTED_SONG:
      return {
        ...state,
        votedSongs: [...state.votedSongs, action.payload]
      };
    case actionTypes.REMOVE_VOTED_SONG:
      return {
        ...state,
        votedSongs: state.votedSongs.filter(id => id !== action.payload)
      };
    case actionTypes.UPDATE_STATS:
      return {
        ...state,
        stats: {
          totalSongs: state.playlist.length,
          totalVotes: state.playlist.reduce((sum, song) => sum + song.votes, 0)
        }
      };
    default:
      return state;
  }
};

export const TopifyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(topifyReducer, initialState);
  const { firestore, firestoreUtils, isReady } = useFirebase();
  const { getSongsPerPage } = useResponsive();

  const loadPlaylistFromFirebase = useCallback(async () => {
    try {
      const { collection, getDocs, query, orderBy } = firestoreUtils;
      const playlistQuery = query(collection(firestore, 'playlist'), orderBy('votes', 'desc'));
      const querySnapshot = await getDocs(playlistQuery);
      
      const playlist = [];
      querySnapshot.forEach((doc) => {
        playlist.push({ firebaseId: doc.id, ...doc.data() });
      });
      
      dispatch({ type: actionTypes.SET_PLAYLIST, payload: playlist });
    } catch (error) {
      console.error('Error loading playlist from Firebase:', error);
    }
  }, [firestore, firestoreUtils]);

  const loadVotedSongsFromFirebase = useCallback(async () => {
    try {
      const { collection, getDocs, query, where } = firestoreUtils;
      const votedSongsQuery = query(
        collection(firestore, 'votedSongs'), 
        where('userId', '==', state.userFingerprint)
      );
      const querySnapshot = await getDocs(votedSongsQuery);
      
      const votedSongs = [];
      querySnapshot.forEach((doc) => {
        votedSongs.push(doc.data().songId);
      });
      
      dispatch({ type: actionTypes.SET_VOTED_SONGS, payload: votedSongs });
    } catch (error) {
      console.error('Error loading voted songs from Firebase:', error);
    }
  }, [firestore, firestoreUtils, state.userFingerprint]);

  // Load data from Firebase when ready
  useEffect(() => {
    if (isReady) {
      loadVotedSongsFromFirebase();
      loadPlaylistFromFirebase();
    }
  }, [isReady, loadVotedSongsFromFirebase, loadPlaylistFromFirebase]);

  // Update stats when playlist changes
  useEffect(() => {
    dispatch({ type: actionTypes.UPDATE_STATS });
  }, [state.playlist]);

  const value = {
    state,
    dispatch,
    actionTypes,
    firestore,
    firestoreUtils,
    isReady,
    getSongsPerPage,
    loadPlaylistFromFirebase,
    loadVotedSongsFromFirebase
  };

  return (
    <TopifyContext.Provider value={value}>
      {children}
    </TopifyContext.Provider>
  );
};

export const useTopify = () => {
  const context = useContext(TopifyContext);
  if (!context) {
    throw new Error('useTopify must be used within a TopifyProvider');
  }
  return context;
};