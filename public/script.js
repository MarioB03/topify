// Topify v2.12 - Fix duplicate song IDs (remove timestamp)
class Topify {
    constructor() {
        this.playlist = [];
        this.votedSongs = [];
        this.searchResults = [];
        this.debounceTimer = null;
        this.isSearching = false;
        this.currentAudio = null;
        this.currentPlayingId = null;
        this.currentPage = 0;
        this.songsPerPage = 12;
        this.firebaseReady = false;
        this.userFingerprint = this.generateUserFingerprint();
        
        // Wait for Firebase to be ready
        this.waitForFirebase().then(async () => {
            this.initializeEventListeners();
            await this.initializeData();
            this.startCountdown();
        });
    }

    async waitForFirebase() {
        // Wait for Firebase to be loaded
        while (!window.firestore) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.firebaseReady = true;
    }

    generateUserFingerprint() {
        // Generar ID único basado en características del navegador
        let fingerprint = localStorage.getItem('topify-user-id');
        
        if (!fingerprint) {
            // Crear ID único usando características del navegador
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Topify fingerprint', 2, 2);
            
            const browserInfo = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                canvas.toDataURL()
            ].join('|');
            
            // Crear hash simple
            let hash = 0;
            for (let i = 0; i < browserInfo.length; i++) {
                const char = browserInfo.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            
            fingerprint = 'user_' + Math.abs(hash) + '_' + Date.now();
            localStorage.setItem('topify-user-id', fingerprint);
        }
        
        console.log('User fingerprint:', fingerprint);
        return fingerprint;
    }

    async initializeData() {
        console.log('Initializing data...');
        // Cargar votos PRIMERO
        await this.loadVotedSongsFromFirebase();
        console.log('Voted songs loaded, now loading playlist...');
        // Luego cargar playlist y renderizar
        await this.loadPlaylistFromFirebase();
        console.log('All data loaded and rendered');
    }

    async findSongInFirebase(songId) {
        if (!this.firebaseReady) return null;
        
        try {
            const { collection, getDocs, query, where } = window.firestoreUtils;
            const songQuery = query(
                collection(window.firestore, 'playlist'),
                where('id', '==', songId)
            );
            const querySnapshot = await getDocs(songQuery);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { firebaseId: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error finding song in Firebase:', error);
            return null;
        }
    }


    async loadPlaylistFromFirebase() {
        try {
            const { collection, getDocs, query, orderBy } = window.firestoreUtils;
            const playlistQuery = query(collection(window.firestore, 'playlist'), orderBy('votes', 'desc'));
            const querySnapshot = await getDocs(playlistQuery);
            
            this.playlist = [];
            querySnapshot.forEach((doc) => {
                this.playlist.push({ firebaseId: doc.id, ...doc.data() });
            });
            
            console.log('Playlist loaded:', this.playlist.length, 'songs');
            
            this.renderPlaylist();
            this.updateStats();
            this.renderMyVotes();
        } catch (error) {
            console.error('Error loading playlist from Firebase:', error);
            // Fallback to localStorage
            this.playlist = JSON.parse(localStorage.getItem('topify-playlist')) || [];
            this.renderPlaylist();
            this.updateStats();
            this.renderMyVotes();
        }
    }

    async loadVotedSongsFromFirebase() {
        try {
            const { collection, getDocs, query, where } = window.firestoreUtils;
            // Solo cargar votos de este usuario específico
            console.log('Loading voted songs for user:', this.userFingerprint);
            const votedSongsQuery = query(
                collection(window.firestore, 'votedSongs'), 
                where('userId', '==', this.userFingerprint)
            );
            const querySnapshot = await getDocs(votedSongsQuery);
            
            this.votedSongs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Found vote:', data);
                this.votedSongs.push(data.songId);
            });
            
            console.log('Total voted songs loaded:', this.votedSongs.length, this.votedSongs);
        } catch (error) {
            console.error('Error loading voted songs from Firebase:', error);
            // Fallback to localStorage
            this.votedSongs = JSON.parse(localStorage.getItem('topify-voted-songs')) || [];
        }
    }

    async savePlaylistToFirebase() {
        if (!this.firebaseReady) return;
        
        try {
            // Save to localStorage as backup
            localStorage.setItem('topify-playlist', JSON.stringify(this.playlist));
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        }
    }

    async saveVotedSongToFirebase(songId) {
        if (!this.firebaseReady) return;
        
        try {
            const { collection, addDoc } = window.firestoreUtils;
            console.log('Saving vote to Firebase:', { songId, userId: this.userFingerprint });
            await addDoc(collection(window.firestore, 'votedSongs'), {
                songId: songId,
                userId: this.userFingerprint,
                timestamp: new Date()
            });
            
            // Save to localStorage as backup
            localStorage.setItem('topify-voted-songs', JSON.stringify(this.votedSongs));
            console.log('Vote saved successfully');
        } catch (error) {
            console.error('Error saving voted song to Firebase:', error);
        }
    }

    async addSongToFirebase(song) {
        if (!this.firebaseReady) return;
        
        try {
            const { collection, addDoc } = window.firestoreUtils;
            
            // Crear nueva entrada (la verificación ya se hizo antes)
            const docRef = await addDoc(collection(window.firestore, 'playlist'), {
                id: song.id,
                title: song.title,
                artist: song.artist,
                cover: song.cover,
                duration: song.duration,
                votes: song.votes,
                createdAt: new Date()
            });
            
            // Update local song with Firebase ID
            song.firebaseId = docRef.id;
            console.log('New song added to Firebase with ID:', song.firebaseId);
        } catch (error) {
            console.error('Error adding song to Firebase:', error);
        }
    }

    async updateSongInFirebase(song) {
        if (!this.firebaseReady || !song.firebaseId) return;
        
        try {
            const { doc, updateDoc } = window.firestoreUtils;
            const songRef = doc(window.firestore, 'playlist', song.firebaseId);
            await updateDoc(songRef, {
                votes: song.votes,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating song in Firebase:', error);
        }
    }

    async deleteSongFromFirebase(song) {
        if (!this.firebaseReady || !song.firebaseId) return;
        
        try {
            const { doc, deleteDoc } = window.firestoreUtils;
            const songRef = doc(window.firestore, 'playlist', song.firebaseId);
            await deleteDoc(songRef);
        } catch (error) {
            console.error('Error deleting song from Firebase:', error);
        }
    }

    async removeVotedSongFromFirebase(songId) {
        if (!this.firebaseReady) return;
        
        try {
            const { collection, getDocs, deleteDoc, doc, query, where } = window.firestoreUtils;
            // Solo eliminar votos de este usuario específico
            const votedSongsQuery = query(
                collection(window.firestore, 'votedSongs'), 
                where('songId', '==', songId),
                where('userId', '==', this.userFingerprint)
            );
            const querySnapshot = await getDocs(votedSongsQuery);
            
            // Delete votes from this user only
            querySnapshot.forEach(async (docSnapshot) => {
                await deleteDoc(doc(window.firestore, 'votedSongs', docSnapshot.id));
            });
        } catch (error) {
            console.error('Error removing voted song from Firebase:', error);
        }
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('searchInput');

        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    handleSearchInput(query) {
        if (query.length < 2) {
            this.clearResults();
            return;
        }

        this.debounce(() => {
            this.searchSongs(query);
        }, 300);
    }

    clearResults() {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';
        this.searchResults = [];
    }

    async searchSongs(query) {
        if (this.isSearching) return;
        
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '<div class="text-center py-8 text-gray-600"><div class="animate-pulse">🔍 Buscando canciones...</div></div>';

        try {
            this.isSearching = true;
            
            // Use Last.fm API (free, no auth required)
            const lastfmResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&limit=5`);
            
            if (lastfmResponse.ok) {
                const lastfmData = await lastfmResponse.json();
                
                if (lastfmData.results && lastfmData.results.trackmatches && lastfmData.results.trackmatches.track) {
                    // Process tracks and get better images
                    const tracks = lastfmData.results.trackmatches.track;
                    this.searchResults = await Promise.all(tracks.map(async (track) => {
                        const trackData = {
                            title: track.name,
                            artist: {
                                name: track.artist
                            },
                            album: {
                                cover_medium: 'https://via.placeholder.com/250x250?text=🎵',
                                cover_small: 'https://via.placeholder.com/60x60?text=🎵'
                            },
                            duration: 180,
                            preview: null
                        };
                        
                        // Generar ID usando los mismos campos que voteSong
                        trackData.id = `${trackData.artist.name}-${trackData.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        console.log('Generated consistent ID:', trackData.id, 'for:', trackData.artist.name, '-', trackData.title);

                        // Try to get better album art from iTunes API
                        try {
                            const itunesResponse = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.name)}&media=music&entity=song&limit=1`);
                            if (itunesResponse.ok) {
                                const itunesData = await itunesResponse.json();
                                if (itunesData.results && itunesData.results.length > 0) {
                                    const itunesTrack = itunesData.results[0];
                                    trackData.album.cover_medium = itunesTrack.artworkUrl100 || trackData.album.cover_medium;
                                    trackData.album.cover_small = itunesTrack.artworkUrl60 || trackData.album.cover_small;
                                    trackData.preview = itunesTrack.previewUrl; // Bonus: get preview from iTunes
                                }
                            }
                        } catch (e) {
                            // If iTunes fails, try Last.fm images as fallback
                            if (track.image && track.image[2] && track.image[2]['#text']) {
                                trackData.album.cover_medium = track.image[2]['#text'];
                            }
                            if (track.image && track.image[1] && track.image[1]['#text']) {
                                trackData.album.cover_small = track.image[1]['#text'];
                            }
                        }

                        return trackData;
                    }));
                } else {
                    this.searchResults = [];
                }
            } else {
                // Fallback to Jamendo API
                const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=jsonpretty&limit=5&search=${encodeURIComponent(query)}&include=musicinfo`);
                
                if (!response.ok) {
                    throw new Error('Error en la búsqueda');
                }

                const data = await response.json();
                
                // Transform Jamendo data to match our format
                this.searchResults = data.results.map(song => ({
                    id: song.id,
                    title: song.name,
                    artist: {
                        name: song.artist_name
                    },
                    album: {
                        cover_medium: song.album_image || 'https://via.placeholder.com/250x250?text=No+Image',
                        cover_small: song.album_image || 'https://via.placeholder.com/60x60?text=No+Image'
                    },
                    duration: song.duration,
                    preview: song.audio
                }));
            }
            
            this.renderSearchResults();

        } catch (error) {
            console.error('Error searching songs:', error);
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p class="text-lg mb-2">❌ Error al buscar canciones</p>
                    <p class="text-sm">Servicio temporalmente no disponible. Intenta de nuevo en unos minutos.</p>
                    <button onclick="topify.searchSongs('${query}')" class="mt-4 btn-secondary px-4 py-2 rounded-lg text-white">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        } finally {
            this.isSearching = false;
        }
    }

    renderSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        
        if (this.searchResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-16">
                    <div class="text-6xl mb-6">🔍</div>
                    <p class="text-xl font-semibold mb-2 text-gradient">No se encontraron canciones</p>
                    <p class="text-lg text-gray-600">Intenta con otros términos de búsqueda</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = this.searchResults.map(song => {
            const consistentId = `${song.artist.name}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const hasVoted = this.votedSongs.includes(consistentId);
            return `
            <div class="song-card rounded-lg p-2 flex items-center gap-2 ${hasVoted ? 'opacity-60' : ''}">
                <img src="${song.album.cover_medium}" alt="${song.title}" class="w-10 h-10 rounded-md object-cover shadow-lg">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm truncate text-gray-800">${song.title}</div>
                    <div class="truncate font-medium text-xs text-gray-600">${song.artist.name}</div>
                    ${hasVoted ? '<div class="text-xs text-orange-400">✓ Ya votada</div>' : ''}
                </div>
                <div class="flex gap-3 flex-shrink-0">
                    ${song.preview ? `
                        <button class="btn-audio text-white p-2 rounded-full shadow-lg" onclick="topify.togglePreview('${song.id}', '${song.preview}')" title="Escuchar preview">
                            <span id="play-icon-${song.id}" class="text-sm">🎵</span>
                        </button>
                    ` : ''}
                    <button class="btn-secondary text-white px-4 py-2 rounded-lg font-medium shadow-lg ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}" onclick="topify.voteSong('${song.id}')" ${hasVoted ? 'disabled' : ''}>
                        ${hasVoted ? 'Votada' : 'Votar'}
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    async voteSong(songId) {
        const song = this.searchResults.find(s => s.id === songId);
        if (!song) return;

        // Generar ID consistente PRIMERO
        const consistentId = `${song.artist.name}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        console.log('Generated consistent ID:', consistentId, 'for:', song.artist.name, '-', song.title);

        // Verificar si ya se votó por esta canción en esta sesión usando el ID consistente
        if (this.votedSongs.includes(consistentId)) {
            this.showToast('⚠️ Ya votaste por esta canción en esta sesión', 'orange');
            return;
        }
        
        // SIEMPRE verificar primero en Firebase para datos actualizados
        console.log('Searching in Firebase for:', consistentId);
        const firebaseSong = await this.findSongInFirebase(consistentId);
        
        if (firebaseSong) {
            // La canción existe en Firebase, incrementar votos
            console.log('Song exists in Firebase with', firebaseSong.votes, 'votes, incrementing...');
            firebaseSong.votes++;
            
            // Verificar si ya está en la playlist local usando el ID consistente
            let localSong = this.playlist.find(s => s.id === consistentId);
            if (localSong) {
                // Actualizar la canción local
                localSong.votes = firebaseSong.votes;
                localSong.firebaseId = firebaseSong.firebaseId;
            } else {
                // Añadir a la playlist local
                firebaseSong.isNew = true;
                this.playlist.push(firebaseSong);
            }
            
            // Actualizar en Firebase
            await this.updateSongInFirebase(firebaseSong);
        } else {
            // Canción completamente nueva
            console.log('Adding completely new song to Firebase');
            // Asegurar que el ID sea consistente
            const consistentId = `${song.artist.name}-${song.title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            console.log('Using consistent ID for new song:', consistentId);
            const newSong = {
                id: consistentId,
                title: song.title,
                artist: song.artist.name,
                cover: song.album.cover_medium,
                duration: song.duration,
                votes: 1,
                isNew: true
            };
            this.playlist.push(newSong);
            await this.addSongToFirebase(newSong);
        }

        // Registrar el voto en Firebase y localStorage usando el ID consistente
        this.votedSongs.push(consistentId);
        this.saveVotedSongToFirebase(consistentId);

        this.savePlaylistToFirebase();
        // Si es una nueva canción (no estaba en Firebase), ir a la primera página para verla
        const isNewSong = !firebaseSong;
        if (isNewSong) {
            this.currentPage = 0;
        }
        this.renderPlaylist();
        this.updateStats();
        this.renderMyVotes();
        
        // Pausar audio si está reproduciéndose
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.updatePlayIcon(this.currentPlayingId, '🎵');
            this.currentPlayingId = null;
            this.currentAudio = null;
        }

        // Toast notification
        this.showToast(isNewSong ? `🎵 ${song.title} añadida a la playlist!` : `👍 +1 voto para ${song.title}!`, isNewSong ? 'blue' : 'green');
        
        // Animar estadísticas
        this.animateStats();
        
        // Limpiar búsqueda después de votar
        setTimeout(() => {
            document.getElementById('searchInput').value = '';
            this.clearResults();
        }, 500);
    }


    animateStats() {
        // Animar las estadísticas
        const statCards = document.querySelectorAll('[id^="total"], [id^="avg"]');
        statCards.forEach(card => {
            card.parentElement.classList.add('pulse-effect');
            setTimeout(() => {
                card.parentElement.classList.remove('pulse-effect');
            }, 300);
        });
    }

    showToast(message, type = 'green') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        // Cambiar color según el tipo
        const colors = {
            green: 'linear-gradient(135deg, var(--color-sage-medium), var(--color-sage-dark))',
            blue: 'linear-gradient(135deg, var(--color-gold-medium), var(--color-gold-dark))', 
            orange: 'linear-gradient(135deg, var(--color-rose-medium), var(--color-rose-dark))'
        };
        
        // Aplicar el estilo directamente
        toast.style.background = colors[type] || colors.green;
        
        toastMessage.textContent = message;
        
        // Mostrar toast
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
        
        // Ocultar toast después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
        }, 3000);
    }

    createFlyingAnimation(song, buttonElement) {
        // Obtener posiciones
        const buttonRect = buttonElement.getBoundingClientRect();
        const playlistContainer = document.getElementById('playlist');
        const playlistRect = playlistContainer.getBoundingClientRect();
        
        // Crear elemento volador
        const flyingElement = document.createElement('div');
        flyingElement.className = 'flying-song';
        flyingElement.innerHTML = `
            <div class="p-3 flex items-center gap-3 min-w-64">
                <img src="${song.album.cover_small}" alt="${song.title}" class="w-10 h-10 rounded-lg object-cover">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-gray-800 text-sm truncate">${song.title}</div>
                    <div class="text-xs text-gray-600 truncate">${song.artist.name}</div>
                </div>
                <div class="text-green-500 font-bold">+1</div>
            </div>
        `;
        
        // Posición inicial (donde está el botón)
        flyingElement.style.left = buttonRect.left + 'px';
        flyingElement.style.top = buttonRect.top + 'px';
        flyingElement.style.width = Math.max(buttonRect.width, 250) + 'px';
        
        // Añadir al DOM
        document.body.appendChild(flyingElement);
        
        // Calcular posición final (centro de la playlist)
        const targetX = playlistRect.left + (playlistRect.width / 2) - (flyingElement.offsetWidth / 2);
        const targetY = playlistRect.top + (playlistRect.height / 2) - (flyingElement.offsetHeight / 2);
        
        // Iniciar animación después de un frame
        requestAnimationFrame(() => {
            flyingElement.style.left = targetX + 'px';
            flyingElement.style.top = targetY + 'px';
            flyingElement.classList.add('animate');
        });
        
        // Limpiar después de la animación
        setTimeout(() => {
            if (flyingElement.parentNode) {
                flyingElement.parentNode.removeChild(flyingElement);
            }
        }, 800);
    }

    togglePreview(songId, previewUrl) {
        // Si hay audio reproduciéndose, pausarlo
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.updatePlayIcon(this.currentPlayingId, '🎵');
        }

        // Si es la misma canción, solo pausar
        if (this.currentPlayingId === songId) {
            this.currentPlayingId = null;
            this.currentAudio = null;
            return;
        }

        // Reproducir nueva canción
        this.currentAudio = new Audio(previewUrl);
        this.currentPlayingId = songId;
        
        this.currentAudio.play().then(() => {
            this.updatePlayIcon(songId, '⏸️');
        }).catch(error => {
            console.error('Error playing audio:', error);
            this.updatePlayIcon(songId, '❌');
        });

        // Cuando termine la preview
        this.currentAudio.addEventListener('ended', () => {
            this.updatePlayIcon(songId, '🎵');
            this.currentPlayingId = null;
            this.currentAudio = null;
        });

        // Si hay error
        this.currentAudio.addEventListener('error', () => {
            this.updatePlayIcon(songId, '❌');
            this.currentPlayingId = null;
            this.currentAudio = null;
        });
    }

    updatePlayIcon(songId, icon) {
        const iconElement = document.getElementById(`play-icon-${songId}`);
        if (iconElement) {
            iconElement.textContent = icon;
        }
    }

    renderPlaylist() {
        const playlistContainer = document.getElementById('playlist');
        
        if (this.playlist.length === 0) {
            playlistContainer.innerHTML = `
                <div class="text-center py-16">
                    <div class="text-6xl mb-6 floating">🎵</div>
                    <p class="text-xl font-semibold mb-2 text-gradient">Tu playlist está vacía</p>
                    <p class="text-lg text-gray-600">Busca y vota canciones para comenzar</p>
                </div>
            `;
            return;
        }

        const sortedPlaylist = [...this.playlist].sort((a, b) => b.votes - a.votes);
        const startIndex = this.currentPage * this.songsPerPage;
        const endIndex = startIndex + this.songsPerPage;
        const currentPageSongs = sortedPlaylist.slice(startIndex, endIndex);
        const totalPages = Math.ceil(sortedPlaylist.length / this.songsPerPage);
        
        playlistContainer.innerHTML = currentPageSongs.map((song, index) => {
            const canDelete = this.votedSongs.includes(song.id);
            const canVote = !this.votedSongs.includes(song.id);
            const globalPosition = startIndex + index + 1;
            
            // Obtener medalla para las 3 primeras posiciones
            let medal = '';
            if (globalPosition === 1) medal = '🥇';
            else if (globalPosition === 2) medal = '🥈';
            else if (globalPosition === 3) medal = '🥉';
            
            return `
            <div class="playlist-item rounded-lg p-2 flex items-center gap-2 ${song.isNew ? 'new-song' : ''}" data-song-id="${song.id}">
                <div class="text-lg font-bold min-w-8 text-center text-gradient flex items-center justify-center">
                    ${medal ? `<span class="text-xl mr-1">${medal}</span>` : `#${globalPosition}`}
                </div>
                <img src="${song.cover}" alt="${song.title}" class="w-10 h-10 rounded-md object-cover shadow-lg">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm truncate text-gray-800">${song.title}</div>
                    <div class="truncate font-medium text-xs text-gray-600">${song.artist}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="btn-secondary text-white px-3 py-1 rounded-lg font-bold shadow-lg">
                        ${song.votes}
                    </div>
                    ${canVote ? `
                        <button class="btn-success text-white px-3 py-1 rounded-lg shadow-lg font-bold w-12" onclick="topify.addVoteToSong('${song.id}')" title="Votar por esta canción">
                            <span class="text-sm">+1</span>
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-danger text-white px-3 py-1 rounded-lg shadow-lg font-medium w-12" onclick="topify.removeVote('${song.id}')" title="Quitar mi voto">
                            <span class="text-sm">-1</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
        
        // Agregar controles de paginación en un contenedor fijo
        const paginationContainer = document.getElementById('pagination-controls');
        if (totalPages > 1) {
            paginationContainer.innerHTML = `
                <div class="flex justify-between items-center">
                    <button 
                        onclick="topify.previousPage()" 
                        class="btn-secondary px-3 py-1 rounded-md text-white text-sm font-medium ${this.currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${this.currentPage === 0 ? 'disabled' : ''}
                    >
                        ← Anterior
                    </button>
                    <div class="text-xs text-gray-600">
                        Página ${this.currentPage + 1} de ${totalPages}
                    </div>
                    <button 
                        onclick="topify.nextPage()" 
                        class="btn-secondary px-3 py-1 rounded-md text-white text-sm font-medium ${this.currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${this.currentPage === totalPages - 1 ? 'disabled' : ''}
                    >
                        Siguiente →
                    </button>
                </div>
            `;
        } else {
            paginationContainer.innerHTML = '';
        }
        
        // Limpiar flag de nueva canción
        this.playlist.forEach(song => {
            if (song.isNew) {
                setTimeout(() => {
                    delete song.isNew;
                    this.savePlaylist();
                }, 500);
            }
        });
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateStats() {
        const totalSongs = this.playlist.length;
        const totalVotes = this.playlist.reduce((sum, song) => sum + song.votes, 0);

        document.getElementById('totalSongs').textContent = totalSongs;
        document.getElementById('totalVotes').textContent = totalVotes;
    }

    savePlaylist() {
        // Keep localStorage as backup
        localStorage.setItem('topify-playlist', JSON.stringify(this.playlist));
    }

    clearPlaylist() {
        this.playlist = [];
        this.savePlaylist();
        this.renderPlaylist();
    }

    nextPage() {
        const totalPages = Math.ceil(this.playlist.length / this.songsPerPage);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.renderPlaylist();
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPlaylist();
        }
    }

    removeVote(songId) {
        // Solo puede quitar voto si votó por esa canción
        if (!this.votedSongs.includes(songId)) {
            this.showToast('⚠️ Solo puedes quitar votos de canciones que hayas votado', 'orange');
            return;
        }

        const song = this.playlist.find(s => s.id === songId);
        if (!song) return;

        // Restar el voto
        song.votes = Math.max(0, song.votes - 1);

        // Si la canción se queda sin votos, eliminarla de la playlist
        if (song.votes === 0) {
            this.playlist = this.playlist.filter(s => s.id !== songId);
            // Eliminar de Firebase
            this.deleteSongFromFirebase(song);
        } else {
            // Actualizar votos en Firebase
            this.updateSongInFirebase(song);
        }

        // Quitar de la lista de votadas (local y Firebase)
        this.votedSongs = this.votedSongs.filter(id => id !== songId);
        this.removeVotedSongFromFirebase(songId);
        localStorage.setItem('topify-voted-songs', JSON.stringify(this.votedSongs));

        // Ajustar página si es necesario
        const totalPages = Math.ceil(this.playlist.length / this.songsPerPage);
        if (this.currentPage >= totalPages && totalPages > 0) {
            this.currentPage = totalPages - 1;
        }

        this.savePlaylist();
        this.renderPlaylist();
        this.updateStats();
        this.renderMyVotes();
        this.showToast(`↩️ Voto retirado de ${song.title}`, 'blue');
    }

    async addVoteToSong(songId) {
        // Verificar si ya se votó por esta canción en esta sesión
        if (this.votedSongs.includes(songId)) {
            this.showToast('⚠️ Ya votaste por esta canción en esta sesión', 'orange');
            return;
        }

        const song = this.playlist.find(s => s.id === songId);
        if (!song) return;

        // Incrementar votos
        song.votes++;

        // Registrar el voto en Firebase y localStorage
        this.votedSongs.push(songId);
        this.saveVotedSongToFirebase(songId);

        // Actualizar en Firebase
        await this.updateSongInFirebase(song);

        this.savePlaylistToFirebase();
        this.renderPlaylist();
        this.updateStats();
        this.renderMyVotes();
        
        // Toast notification
        this.showToast(`👍 +1 voto para ${song.title}!`, 'green');
        
        // Animar estadísticas
        this.animateStats();
    }

    startCountdown() {
        // Fecha límite: 23 de agosto de 2025 a las 23:59:59
        const deadline = new Date('2025-08-23T23:59:59').getTime();
        
        const updateCountdown = () => {
            const now = new Date().getTime();
            const timeLeft = deadline - now;
            
            if (timeLeft < 0) {
                document.getElementById('countdown').innerHTML = '¡Votaciones cerradas!';
                // Aquí podrías deshabilitar los botones de votación
                return;
            }
            
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').innerHTML = 
                `${days}d ${hours}h ${minutes}m ${seconds}s`;
        };
        
        // Actualizar inmediatamente y luego cada segundo
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    renderMyVotes() {
        const myVotesContainer = document.getElementById('myVotes');
        const myVotesCount = document.getElementById('myVotesCount');
        
        if (this.votedSongs.length === 0) {
            myVotesContainer.innerHTML = `
                <div class="text-center py-16">
                    <div class="text-6xl mb-6 floating">💭</div>
                    <p class="text-xl font-semibold mb-2 text-gradient">No has votado aún</p>
                    <p class="text-lg text-gray-600">Busca y vota por tus canciones favoritas</p>
                </div>
            `;
            myVotesCount.textContent = '0 votos';
            return;
        }

        // Filtrar las canciones que están en la playlist y que he votado
        const myVotedSongs = this.playlist.filter(song => 
            this.votedSongs.includes(song.id)
        ).sort((a, b) => b.votes - a.votes);

        myVotesContainer.innerHTML = myVotedSongs.map((song, index) => {
            // Obtener posición global en la playlist completa
            const globalPosition = [...this.playlist]
                .sort((a, b) => b.votes - a.votes)
                .findIndex(s => s.id === song.id) + 1;
            
            // Obtener medalla para las 3 primeras posiciones
            let medal = '';
            if (globalPosition === 1) medal = '🥇';
            else if (globalPosition === 2) medal = '🥈';
            else if (globalPosition === 3) medal = '🥉';
            
            return `
            <div class="playlist-item rounded-lg p-2 flex items-center gap-2" data-song-id="${song.id}">
                <div class="text-sm font-bold min-w-8 text-center text-gradient flex items-center justify-center">
                    ${medal ? `<span class="text-lg">${medal}</span>` : `#${globalPosition}`}
                </div>
                <img src="${song.cover}" alt="${song.title}" class="w-8 h-8 rounded-md object-cover shadow-lg">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-xs truncate text-gray-800">${song.title}</div>
                    <div class="truncate font-medium text-xs text-gray-600">${song.artist}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="btn-secondary text-white px-2 py-1 rounded-lg font-bold shadow-lg text-xs">
                        ${song.votes}
                    </div>
                    <button class="btn-danger text-white px-2 py-1 rounded-lg shadow-lg font-medium text-xs" onclick="topify.removeVote('${song.id}')" title="Quitar mi voto">
                        -1
                    </button>
                </div>
            </div>
            `;
        }).join('');
        
        myVotesCount.textContent = `${this.votedSongs.length} voto${this.votedSongs.length !== 1 ? 's' : ''}`;
    }


}

const topify = new Topify();