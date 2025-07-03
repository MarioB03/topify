import { v4 as uuidv4 } from 'uuid';

// Constantes para el tracking
const DEVICE_ID_KEY = 'topify_device_id';
const VOTED_SONGS_KEY = 'topify_voted_songs';

// Clase simplificada para manejar el tracking del dispositivo
export class DeviceTracker {
  private deviceId: string;
  private isPrivateMode: boolean = false;

  constructor() {
    this.deviceId = this.initializeDeviceId();
    this.checkPrivateMode();
  }

  // Inicializar o recuperar ID del dispositivo
  private initializeDeviceId(): string {
    try {
      // Intentar recuperar de localStorage
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      
      if (!deviceId) {
        // Generar nuevo ID único
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      // Si localStorage falla (modo privado), usar ID temporal
      console.warn('LocalStorage no disponible, usando ID temporal');
      this.isPrivateMode = true;
      return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  }

  // Detectar si está en modo privado/incógnito
  private checkPrivateMode(): void {
    try {
      const testKey = '_topify_test_';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Verificar quota de storage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({ quota }) => {
          // En modo incógnito, la quota suele ser mucho menor
          if (quota && quota < 120000000) { // < 120MB aproximadamente
            this.isPrivateMode = true;
          }
        });
      }
    } catch (e) {
      this.isPrivateMode = true;
    }
  }

  // Obtener ID del dispositivo
  getDeviceId(): string {
    return this.deviceId;
  }

  // Verificar si está en modo privado
  isInPrivateMode(): boolean {
    return this.isPrivateMode;
  }

  // Verificar si puede votar (solo 1 voto por canción)
  canVote(songId: string): { allowed: boolean; reason?: string } {
    if (this.isPrivateMode) {
      return { 
        allowed: false, 
        reason: 'El modo privado/incógnito no permite votar. Usa una ventana normal.' 
      };
    }

    // Verificar si ya votó por esta canción
    if (this.hasVotedForSong(songId)) {
      return { 
        allowed: false, 
        reason: 'Ya has votado por esta canción.' 
      };
    }

    return { allowed: true };
  }

  // Verificar si ya votó por una canción
  hasVotedForSong(songId: string): boolean {
    if (this.isPrivateMode) return false;

    try {
      const votedSongs = this.getVotedSongs();
      return votedSongs.includes(songId);
    } catch (error) {
      console.error('Error verificando voto:', error);
      return false;
    }
  }

  // Obtener canciones votadas
  getVotedSongs(): string[] {
    if (this.isPrivateMode) return [];

    try {
      const stored = localStorage.getItem(VOTED_SONGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error obteniendo canciones votadas:', error);
      return [];
    }
  }

  // Registrar un voto
  recordVote(songId: string): boolean {
    if (this.isPrivateMode) return false;

    const canVoteResult = this.canVote(songId);
    if (!canVoteResult.allowed) {
      console.warn(canVoteResult.reason);
      return false;
    }

    try {
      // Actualizar canciones votadas
      const votedSongs = this.getVotedSongs();
      votedSongs.push(songId);
      localStorage.setItem(VOTED_SONGS_KEY, JSON.stringify(votedSongs));

      return true;
    } catch (error) {
      console.error('Error registrando voto:', error);
      return false;
    }
  }

  // Remover un voto
  removeVote(songId: string): boolean {
    if (this.isPrivateMode) return false;

    try {
      // Actualizar canciones votadas
      const votedSongs = this.getVotedSongs();
      const index = votedSongs.indexOf(songId);
      if (index > -1) {
        votedSongs.splice(index, 1);
        localStorage.setItem(VOTED_SONGS_KEY, JSON.stringify(votedSongs));
        return true;
      }
    } catch (error) {
      console.error('Error removiendo voto:', error);
    }

    return false;
  }

  // Obtener estadísticas del dispositivo
  getStats() {
    const votedSongs = this.getVotedSongs();
    
    return {
      deviceId: this.deviceId,
      isPrivateMode: this.isPrivateMode,
      votedSongsCount: votedSongs.length
    };
  }

  // Limpiar todos los datos (útil para testing o reset manual)
  clearAllData(): void {
    if (this.isPrivateMode) return;

    try {
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(VOTED_SONGS_KEY);
      
      // Reinicializar
      this.deviceId = this.initializeDeviceId();
    } catch (error) {
      console.error('Error limpiando datos:', error);
    }
  }
}

// Singleton instance
let deviceTrackerInstance: DeviceTracker | null = null;

export const getDeviceTracker = (): DeviceTracker => {
  if (!deviceTrackerInstance) {
    deviceTrackerInstance = new DeviceTracker();
  }
  return deviceTrackerInstance;
};