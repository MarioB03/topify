class Topify {
    constructor() {
        this.playlist = JSON.parse(localStorage.getItem('topify-playlist')) || [];
        this.searchResults = [];
        this.debounceTimer = null;
        this.isSearching = false;
        this.currentAudio = null;
        this.currentPlayingId = null;
        this.currentPage = 0;
        this.songsPerPage = 5;
        
        this.initializeEventListeners();
        this.renderPlaylist();
        this.updateStats();
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
    }

    async searchSongs(query) {
        if (this.isSearching) return;
        
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '<div class="text-center py-8 text-gray-600"><div class="animate-pulse">🔍 Buscando canciones...</div></div>';

        try {
            this.isSearching = true;
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
            
            if (!response.ok) {
                throw new Error('Error en la búsqueda');
            }

            const data = await response.json();
            this.searchResults = data.data || [];
            this.renderSearchResults();

        } catch (error) {
            console.error('Error searching songs:', error);
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p class="text-lg mb-2">❌ Error al buscar canciones</p>
                    <p class="text-sm">Revisa tu conexión a internet</p>
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
                    <p class="text-lg text-gray-300">Intenta con otros términos de búsqueda</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = this.searchResults.map(song => `
            <div class="song-card rounded-lg p-2 flex items-center gap-2">
                <img src="${song.album.cover_medium}" alt="${song.title}" class="w-10 h-10 rounded-md object-cover shadow-lg">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm truncate text-gray-100">${song.title}</div>
                    <div class="truncate font-medium text-xs text-gray-200">${song.artist.name}</div>
                </div>
                <div class="flex gap-3 flex-shrink-0">
                    ${song.preview ? `
                        <button class="btn-audio text-white p-2 rounded-full shadow-lg" onclick="topify.togglePreview(${song.id}, '${song.preview}')" title="Escuchar preview">
                            <span id="play-icon-${song.id}" class="text-sm">▶️</span>
                        </button>
                    ` : ''}
                    <button class="btn-secondary text-white px-4 py-2 rounded-lg font-medium shadow-lg" onclick="topify.voteSong(${song.id})">
                        Votar
                    </button>
                </div>
            </div>
        `).join('');
    }

    voteSong(songId) {
        const song = this.searchResults.find(s => s.id === songId);
        if (!song) return;

        const existingSong = this.playlist.find(s => s.id === songId);
        const isNewSong = !existingSong;
        
        if (existingSong) {
            existingSong.votes++;
        } else {
            this.playlist.push({
                id: song.id,
                title: song.title,
                artist: song.artist.name,
                cover: song.album.cover_medium,
                duration: song.duration,
                votes: 1,
                isNew: true
            });
        }

        this.savePlaylist();
        // Si es una nueva canción, ir a la primera página para verla
        if (isNewSong) {
            this.currentPage = 0;
        }
        this.renderPlaylist();
        this.updateStats();
        
        // Pausar audio si está reproduciéndose
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.updatePlayIcon(this.currentPlayingId, '▶️');
            this.currentPlayingId = null;
            this.currentAudio = null;
        }

        // Animación de canción volando
        if (isNewSong) {
            this.createFlyingAnimation(song, event.target);
        }
        
        // Feedback visual mejorado
        this.showVoteSuccess(song, isNewSong);
        
        // Animar estadísticas
        this.animateStats();
        
        // Limpiar búsqueda después de votar
        setTimeout(() => {
            document.getElementById('searchInput').value = '';
            this.clearResults();
        }, 500);
    }

    showVoteSuccess(song, isNewSong) {
        // Animación del botón
        const button = event.target;
        button.classList.add('vote-success');
        button.textContent = isNewSong ? '¡Añadida!' : '¡+1 Voto!';
        button.style.background = '#10b981';
        
        // Toast notification
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (isNewSong) {
            toastMessage.innerHTML = `🎵 <strong>${song.title}</strong> añadida a la playlist!`;
            toast.className = toast.className.replace('bg-green-500', 'bg-blue-500');
        } else {
            toastMessage.innerHTML = `👍 <strong>+1 voto</strong> para ${song.title}!`;
            toast.className = toast.className.replace('bg-blue-500', 'bg-green-500');
        }
        
        // Mostrar toast
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
        
        // Ocultar toast después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
        }, 3000);
        
        // Restaurar botón
        setTimeout(() => {
            button.classList.remove('vote-success');
            button.textContent = 'Votar';
            button.style.background = '';
        }, 1000);
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
            this.updatePlayIcon(this.currentPlayingId, '▶️');
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
            this.updatePlayIcon(songId, '▶️');
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
                    <p class="text-lg text-gray-300">Busca y vota canciones para comenzar</p>
                </div>
            `;
            return;
        }

        const sortedPlaylist = [...this.playlist].sort((a, b) => b.votes - a.votes);
        const startIndex = this.currentPage * this.songsPerPage;
        const endIndex = startIndex + this.songsPerPage;
        const currentPageSongs = sortedPlaylist.slice(startIndex, endIndex);
        const totalPages = Math.ceil(sortedPlaylist.length / this.songsPerPage);
        
        playlistContainer.innerHTML = currentPageSongs.map((song, index) => `
            <div class="playlist-item rounded-lg p-2 flex items-center gap-2 ${song.isNew ? 'new-song' : ''}" data-song-id="${song.id}">
                <div class="text-lg font-bold min-w-8 text-center text-gradient">
                    #${startIndex + index + 1}
                </div>
                <img src="${song.cover}" alt="${song.title}" class="w-10 h-10 rounded-md object-cover shadow-lg">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm truncate text-gray-100">${song.title}</div>
                    <div class="truncate font-medium text-xs text-gray-200">${song.artist}</div>
                </div>
                <div class="btn-primary text-white px-3 py-1 rounded-lg font-bold shadow-lg">
                    ${song.votes}
                </div>
            </div>
        `).join('');
        
        // Agregar controles de paginación
        if (totalPages > 1) {
            playlistContainer.innerHTML += `
                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
                    <button 
                        onclick="topify.previousPage()" 
                        class="btn-secondary px-3 py-1 rounded-md text-white text-sm font-medium ${this.currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${this.currentPage === 0 ? 'disabled' : ''}
                    >
                        ← Anterior
                    </button>
                    <div class="text-xs text-gray-300">
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
        const totalDuration = this.playlist.reduce((sum, song) => sum + (song.duration || 0), 0);
        const avgVotes = totalSongs > 0 ? Math.round(totalVotes / totalSongs) : 0;

        document.getElementById('totalSongs').textContent = totalSongs;
        document.getElementById('totalVotes').textContent = totalVotes;
        document.getElementById('avgVotes').textContent = avgVotes;
        document.getElementById('totalDuration').textContent = this.formatDuration(totalDuration);
    }

    savePlaylist() {
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
}

const topify = new Topify();