import React, { useState, useCallback } from 'react';
import { useTopify } from '../context/TopifyContext';
import { useResponsive } from '../hooks/useResponsive';
import SongCard from './SongCard';
import LoadingSkeleton from './LoadingSkeleton';

const SearchSection: React.FC = () => {
  const { state, dispatch, actionTypes } = useTopify();
  const { isMobile } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const searchSongs = useCallback(async (query: string) => {
    if (query.length < 2) {
      dispatch({ type: actionTypes.SET_SEARCH_RESULTS, payload: [] });
      return;
    }

    dispatch({ type: actionTypes.SET_IS_SEARCHING, payload: true });

    // Mock search results for localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log('🔍 Localhost detected - using mock search results');
      
      // Simulate API delay
      setTimeout(() => {
        const mockResults = [
          {
            id: `mock${query}1`,
            title: `${query} Song 1`,
            artist: { name: 'Mock Artist 1' },
            album: {
              cover_medium: 'https://via.placeholder.com/250x250/8b5cf6/ffffff?text=🎵',
              cover_small: 'https://via.placeholder.com/60x60/8b5cf6/ffffff?text=🎵'
            },
            duration: 180,
            preview: null,
            votes: 0
          },
          {
            id: `mock${query}2`,
            title: `${query} Song 2`,
            artist: { name: 'Mock Artist 2' },
            album: {
              cover_medium: 'https://via.placeholder.com/250x250/10b981/ffffff?text=🎵',
              cover_small: 'https://via.placeholder.com/60x60/10b981/ffffff?text=🎵'
            },
            duration: 200,
            preview: null,
            votes: 0
          },
          {
            id: `mock${query}3`,
            title: `${query} Song 3`,
            artist: { name: 'Mock Artist 3' },
            album: {
              cover_medium: 'https://via.placeholder.com/250x250/f59e0b/ffffff?text=🎵',
              cover_small: 'https://via.placeholder.com/60x60/f59e0b/ffffff?text=🎵'
            },
            duration: 220,
            preview: null,
            votes: 0
          }
        ];
        
        dispatch({ type: actionTypes.SET_SEARCH_RESULTS, payload: mockResults });
        dispatch({ type: actionTypes.SET_IS_SEARCHING, payload: false });
      }, 500);
      
      return;
    }

    try {
      const lastfmResponse = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&limit=5`
      );
      
      if (lastfmResponse.ok) {
        const lastfmData = await lastfmResponse.json();
        
        if (lastfmData.results && lastfmData.results.trackmatches && lastfmData.results.trackmatches.track) {
          const tracks = lastfmData.results.trackmatches.track;
          const processedTracks = await Promise.all(tracks.map(async (track: { artist: string; name: string; image?: Array<{ '#text': string }> }) => {
            const trackData = {
              id: `${track.artist}-${track.name}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
              title: track.name,
              artist: {
                name: track.artist
              },
              album: {
                cover_medium: 'https://via.placeholder.com/250x250?text=🎵',
                cover_small: 'https://via.placeholder.com/60x60?text=🎵'
              },
              duration: 180,
              preview: null,
              votes: 0
            };

            try {
              const itunesResponse = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.name)}&media=music&entity=song&limit=1`
              );
              if (itunesResponse.ok) {
                const itunesData = await itunesResponse.json();
                if (itunesData.results && itunesData.results.length > 0) {
                  const itunesTrack = itunesData.results[0];
                  trackData.album.cover_medium = itunesTrack.artworkUrl100 || trackData.album.cover_medium;
                  trackData.album.cover_small = itunesTrack.artworkUrl60 || trackData.album.cover_small;
                  trackData.preview = itunesTrack.previewUrl;
                }
              }
            } catch {
              if (track.image && track.image[2] && track.image[2]['#text']) {
                trackData.album.cover_medium = track.image[2]['#text'];
              }
              if (track.image && track.image[1] && track.image[1]['#text']) {
                trackData.album.cover_small = track.image[1]['#text'];
              }
            }

            return trackData;
          }));
          
          dispatch({ type: actionTypes.SET_SEARCH_RESULTS, payload: processedTracks });
        } else {
          dispatch({ type: actionTypes.SET_SEARCH_RESULTS, payload: [] });
        }
      }
    } catch (error) {
      console.error('Error searching songs:', error);
    } finally {
      dispatch({ type: actionTypes.SET_IS_SEARCHING, payload: false });
    }
  }, [dispatch, actionTypes]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      searchSongs(query);
    }, 300);

    setDebounceTimer(timer);
  };

  return (
    <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col flex-1`}>
      <h2 className={`section-title ${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-4' : 'mb-6'}`}>
        🔍 Buscar música
      </h2>
      
      <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={handleSearchInput}
          placeholder="Busca canciones por título o artista..."
          className={`search-input w-full ${isMobile ? 'px-4 py-3 text-base' : 'px-6 py-4 text-lg'} rounded-2xl font-medium`}
          autoComplete="off"
        />
      </div>
      
      <div className="space-y-2 overflow-y-auto flex-1">
        {state.isSearching ? (
          <LoadingSkeleton count={3} type="song" />
        ) : state.searchResults.length === 0 && searchQuery.length >= 2 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-bounce">🔍</div>
            <p className="text-xl font-semibold mb-2 text-gradient">No se encontraron canciones</p>
            <p className="text-lg text-gray-600">Intenta con otros términos de búsqueda</p>
          </div>
        ) : searchQuery.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-float">🎵</div>
            <p className="text-xl font-semibold mb-2 text-gradient">Busca tu música favorita</p>
            <p className="text-lg text-gray-600">Escribe el nombre de una canción o artista</p>
          </div>
        ) : (
          state.searchResults.map((song) => (
            <SongCard key={song.id} song={song} isSearchResult={true} />
          ))
        )}
      </div>
    </section>
  );
};

export default SearchSection;