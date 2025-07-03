import { sanitizeString } from './validation';

// Normalizar texto para comparación
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
    .trim();
};

// Generar ID único para canción basado en título y artista
export const generateSongId = (artist: string, title: string): string => {
  const normalizedArtist = normalizeText(artist);
  const normalizedTitle = normalizeText(title);
  return `${normalizedArtist}-${normalizedTitle}`;
};

// Calcular similitud entre dos strings (algoritmo de Levenshtein)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Inicializar primera fila y columna
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Llenar la matriz
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
};

// Interfaz para resultado de búsqueda de duplicados
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingSong?: {
    id: string;
    title: string;
    artist: string;
    similarity: number;
  };
  reason?: string;
}

// Verificar si una canción es duplicada
export const checkForDuplicates = (
  newSong: { artist: string; title: string },
  existingSongs: Array<{ id: string; title: string; artist: string | { name: string } }>
): DuplicateCheckResult => {
  const newArtist = typeof newSong.artist === 'string' ? newSong.artist : newSong.artist;
  const newTitle = newSong.title;
  
  // Umbral de similitud (85% similar se considera duplicado)
  const SIMILARITY_THRESHOLD = 0.85;
  
  for (const song of existingSongs) {
    const existingArtist = typeof song.artist === 'string' ? song.artist : song.artist.name;
    
    // Comparación exacta primero (más eficiente)
    if (normalizeText(existingArtist) === normalizeText(newArtist) &&
        normalizeText(song.title) === normalizeText(newTitle)) {
      return {
        isDuplicate: true,
        existingSong: {
          id: song.id,
          title: song.title,
          artist: existingArtist,
          similarity: 1
        },
        reason: 'Esta canción ya está en la playlist'
      };
    }
    
    // Comparación por similitud
    const artistSimilarity = calculateSimilarity(existingArtist, newArtist);
    const titleSimilarity = calculateSimilarity(song.title, newTitle);
    const combinedSimilarity = (artistSimilarity * 0.4 + titleSimilarity * 0.6); // Título pesa más
    
    if (combinedSimilarity >= SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        existingSong: {
          id: song.id,
          title: song.title,
          artist: existingArtist,
          similarity: combinedSimilarity
        },
        reason: `Canción muy similar ya existe: "${song.title}" de ${existingArtist}`
      };
    }
  }
  
  return { isDuplicate: false };
};

// Función para limpiar y formatear nombres de artistas/títulos
export const formatSongInfo = (text: string): string => {
  return sanitizeString(text)
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .replace(/\s*-\s*/g, ' - ') // Formatear guiones
    .replace(/\s*feat\.?\s*/gi, ' feat. ') // Formatear featuring
    .replace(/\s*ft\.?\s*/gi, ' ft. ') // Formatear ft
    .trim();
};