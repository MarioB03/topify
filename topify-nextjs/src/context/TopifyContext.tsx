import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { useResponsive } from '../hooks/useResponsive';

interface Song {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  album: {
    cover_medium: string;
    cover_small: string;
  };
  duration: number;
  preview?: string | null;
  votes: number;
  firebaseId?: string;
}

interface TopifyState {
  playlist: Song[];
  votedSongs: string[];
  searchResults: Song[];
  currentPage: number;
  myVotesPage: number;
  isSearching: boolean;
  isLoadingPlaylist: boolean;
  isLoadingVotes: boolean;
  currentAudio: HTMLAudioElement | null;
  currentPlayingId: string | null;
  userFingerprint: string;
  stats: {
    totalSongs: number;
    totalVotes: number;
  };
}

// Generate user fingerprint
const generateUserFingerprint = (): string => {
  let fingerprint = localStorage?.getItem('topify-user-id');
  
  if (!fingerprint && typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Topify fingerprint', 2, 2);
    }
    
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
  
  return fingerprint || '';
};

// Mock data for localhost development
const mockPlaylist: Song[] = [
  {
    id: 'bohemianrhapsody',
    title: 'Bohemian Rhapsody',
    artist: { name: 'Queen' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/8b5cf6/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/8b5cf6/ffffff?text=🎵'
    },
    duration: 355,
    votes: 45,
    firebaseId: 'mock1'
  },
  {
    id: 'imaginejohnlennon',
    title: 'Imagine',
    artist: { name: 'John Lennon' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/10b981/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/10b981/ffffff?text=🎵'
    },
    duration: 183,
    votes: 38,
    firebaseId: 'mock2'
  },
  {
    id: 'hotelcalifornia',
    title: 'Hotel California',
    artist: { name: 'Eagles' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/f59e0b/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/f59e0b/ffffff?text=🎵'
    },
    duration: 391,
    votes: 32,
    firebaseId: 'mock3'
  },
  {
    id: 'stairwaytoheaven',
    title: 'Stairway to Heaven',
    artist: { name: 'Led Zeppelin' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/ef4444/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/ef4444/ffffff?text=🎵'
    },
    duration: 482,
    votes: 28,
    firebaseId: 'mock4'
  },
  {
    id: 'shapeof you',
    title: 'Shape of You',
    artist: { name: 'Ed Sheeran' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/06b6d4/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/06b6d4/ffffff?text=🎵'
    },
    duration: 233,
    votes: 25,
    firebaseId: 'mock5'
  },
  {
    id: 'blinkingfights',
    title: 'Blinding Lights',
    artist: { name: 'The Weeknd' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/8b5cf6/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/8b5cf6/ffffff?text=🎵'
    },
    duration: 200,
    votes: 22,
    firebaseId: 'mock6'
  },
  {
    id: 'danceMonkey',
    title: 'Dance Monkey',
    artist: { name: 'Tones and I' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/f97316/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/f97316/ffffff?text=🎵'
    },
    duration: 209,
    votes: 20,
    firebaseId: 'mock7'
  },
  {
    id: 'watermelonsugar',
    title: 'Watermelon Sugar',
    artist: { name: 'Harry Styles' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/10b981/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/10b981/ffffff?text=🎵'
    },
    duration: 174,
    votes: 18,
    firebaseId: 'mock8'
  },
  {
    id: 'levelingup',
    title: 'Levitating',
    artist: { name: 'Dua Lipa' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/ec4899/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/ec4899/ffffff?text=🎵'
    },
    duration: 203,
    votes: 15,
    firebaseId: 'mock9'
  },
  {
    id: 'goodAsHell',
    title: 'Good as Hell',
    artist: { name: 'Lizzo' },
    album: {
      cover_medium: 'https://via.placeholder.com/250x250/f59e0b/ffffff?text=🎵',
      cover_small: 'https://via.placeholder.com/60x60/f59e0b/ffffff?text=🎵'
    },
    duration: 219,
    votes: 12,
    firebaseId: 'mock10'
  }
];

const mockVotedSongs = ['bohemianrhapsody', 'imaginejohnlennon', 'hotelcalifornia'];

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Initial state
const initialState: TopifyState = {
  playlist: isLocalhost ? mockPlaylist : [],
  votedSongs: isLocalhost ? mockVotedSongs : [],
  searchResults: [],
  currentPage: 0,
  myVotesPage: 0,
  isSearching: false,
  isLoadingPlaylist: !isLocalhost,
  isLoadingVotes: !isLocalhost,
  currentAudio: null,
  currentPlayingId: null,
  userFingerprint: typeof window !== 'undefined' ? generateUserFingerprint() : '',
  stats: {
    totalSongs: isLocalhost ? mockPlaylist.length : 0,
    totalVotes: isLocalhost ? mockPlaylist.reduce((sum, song) => sum + song.votes, 0) : 0
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
  SET_IS_LOADING_PLAYLIST: 'SET_IS_LOADING_PLAYLIST',
  SET_IS_LOADING_VOTES: 'SET_IS_LOADING_VOTES',
  SET_CURRENT_AUDIO: 'SET_CURRENT_AUDIO',
  ADD_SONG_TO_PLAYLIST: 'ADD_SONG_TO_PLAYLIST',
  UPDATE_SONG_VOTES: 'UPDATE_SONG_VOTES',
  REMOVE_SONG_FROM_PLAYLIST: 'REMOVE_SONG_FROM_PLAYLIST',
  ADD_VOTED_SONG: 'ADD_VOTED_SONG',
  REMOVE_VOTED_SONG: 'REMOVE_VOTED_SONG',
  UPDATE_STATS: 'UPDATE_STATS'
} as const;

type ActionType = typeof actionTypes[keyof typeof actionTypes];

interface Action {
  type: ActionType;
  payload?: unknown;
}

// Reducer
const topifyReducer = (state: TopifyState, action: Action): TopifyState => {
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
    case actionTypes.SET_IS_LOADING_PLAYLIST:
      return { ...state, isLoadingPlaylist: action.payload };
    case actionTypes.SET_IS_LOADING_VOTES:
      return { ...state, isLoadingVotes: action.payload };
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

interface TopifyContextType {
  state: TopifyState;
  dispatch: React.Dispatch<Action>;
  actionTypes: typeof actionTypes;
  firestore: any;
  firestoreUtils: any;
  isReady: boolean;
  getSongsPerPage: () => number;
  loadPlaylistFromFirebase: () => Promise<void>;
  loadVotedSongsFromFirebase: () => Promise<void>;
}

const TopifyContext = createContext<TopifyContextType | null>(null);

interface TopifyProviderProps {
  children: ReactNode;
}

export const TopifyProvider: React.FC<TopifyProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(topifyReducer, initialState);
  const { firestore, firestoreUtils, isReady } = useFirebase();
  const { getSongsPerPage } = useResponsive();

  const loadPlaylistFromFirebase = useCallback(async () => {
    if (isLocalhost) {
      console.log('🚀 Localhost detected - using mock data');
      return;
    }
    
    if (!isReady || !firestore || !firestoreUtils) return;
    
    dispatch({ type: actionTypes.SET_IS_LOADING_PLAYLIST, payload: true });
    
    try {
      const { collection, getDocs, query, orderBy } = firestoreUtils as any;
      const playlistQuery = query(collection(firestore, 'playlist'), orderBy('votes', 'desc'));
      const querySnapshot = await getDocs(playlistQuery);
      
      const playlist: Song[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Song, 'firebaseId'>;
        playlist.push({ firebaseId: doc.id, ...data });
      });
      
      dispatch({ type: actionTypes.SET_PLAYLIST, payload: playlist });
    } catch (error) {
      console.error('Error loading playlist from Firebase:', error);
    } finally {
      dispatch({ type: actionTypes.SET_IS_LOADING_PLAYLIST, payload: false });
    }
  }, [firestore, firestoreUtils, isReady]);

  const loadVotedSongsFromFirebase = useCallback(async () => {
    if (isLocalhost) {
      console.log('🚀 Localhost detected - using mock voted songs');
      return;
    }
    
    if (!isReady || !firestore || !firestoreUtils) return;
    
    dispatch({ type: actionTypes.SET_IS_LOADING_VOTES, payload: true });
    
    try {
      const { collection, getDocs, query, where } = firestoreUtils as any;
      const votedSongsQuery = query(
        collection(firestore, 'votedSongs'), 
        where('userId', '==', state.userFingerprint)
      );
      const querySnapshot = await getDocs(votedSongsQuery);
      
      const votedSongs: string[] = [];
      querySnapshot.forEach((doc) => {
        votedSongs.push(doc.data().songId);
      });
      
      dispatch({ type: actionTypes.SET_VOTED_SONGS, payload: votedSongs });
    } catch (error) {
      console.error('Error loading voted songs from Firebase:', error);
    } finally {
      dispatch({ type: actionTypes.SET_IS_LOADING_VOTES, payload: false });
    }
  }, [firestore, firestoreUtils, state.userFingerprint, isReady]);

  // Load data from Firebase when ready (skip in localhost)
  useEffect(() => {
    if (!isLocalhost && isReady && state.userFingerprint) {
      loadVotedSongsFromFirebase();
      loadPlaylistFromFirebase();
    }
  }, [isReady, state.userFingerprint, loadVotedSongsFromFirebase, loadPlaylistFromFirebase]);

  // Update stats when playlist changes
  useEffect(() => {
    dispatch({ type: actionTypes.UPDATE_STATS });
  }, [state.playlist]);

  const value: TopifyContextType = {
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

export const useTopify = (): TopifyContextType => {
  const context = useContext(TopifyContext);
  if (!context) {
    throw new Error('useTopify must be used within a TopifyProvider');
  }
  return context;
};