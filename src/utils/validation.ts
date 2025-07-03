import { z } from 'zod';
import DOMPurify from 'dompurify';

// Configuración de DOMPurify para sanitización estricta
const purifyConfig = {
  ALLOWED_TAGS: [], // No permitir ninguna etiqueta HTML
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true, // Mantener el contenido de texto
};

// Función para sanitizar strings
export const sanitizeString = (input: string): string => {
  if (typeof window === 'undefined') {
    // En el servidor, solo eliminar caracteres peligrosos básicos
    return input
      .replace(/[<>]/g, '') // Eliminar < y >
      .replace(/javascript:/gi, '') // Eliminar javascript:
      .replace(/on\w+\s*=/gi, '') // Eliminar event handlers
      .trim();
  }
  
  // En el cliente, usar DOMPurify
  return DOMPurify.sanitize(input, purifyConfig).trim();
};

// Esquema para validar búsquedas
export const searchQuerySchema = z.string()
  .min(2, 'La búsqueda debe tener al menos 2 caracteres')
  .max(100, 'La búsqueda no puede exceder 100 caracteres')
  .transform(sanitizeString);

// Esquema para validar datos de canciones
export const songSchema = z.object({
  id: z.string()
    .min(1, 'ID requerido')
    .max(200, 'ID demasiado largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID contiene caracteres no válidos'),
  
  title: z.string()
    .min(1, 'Título requerido')
    .max(200, 'Título demasiado largo')
    .transform(sanitizeString),
  
  artist: z.object({
    name: z.string()
      .min(1, 'Nombre de artista requerido')
      .max(200, 'Nombre de artista demasiado largo')
      .transform(sanitizeString),
  }),
  
  album: z.object({
    cover_medium: z.string().url().optional().nullable(),
    cover_small: z.string().url().optional().nullable(),
  }).optional(),
  
  duration: z.number()
    .int()
    .min(0)
    .max(3600) // Max 1 hora
    .optional(),
  
  preview: z.string().url().optional().nullable(),
  
  votes: z.number()
    .int()
    .min(0)
    .max(999999), // Límite razonable de votos
});

// Esquema para validar votos
export const voteSchema = z.object({
  songId: z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/),
  
  increment: z.literal(1), // Solo permitir incrementos de 1
});

// Tipo para una canción validada
export type ValidatedSong = z.infer<typeof songSchema>;

// Función helper para validar y sanitizar canciones
export const validateAndSanitizeSong = (song: any): ValidatedSong | null => {
  try {
    return songSchema.parse(song);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validación de canción falló:', error.errors);
    }
    return null;
  }
};

// Función para validar búsquedas
export const validateSearchQuery = (query: string): string | null => {
  try {
    // No mostrar error si la búsqueda está vacía
    if (query.trim().length === 0) {
      return null;
    }
    
    return searchQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Solo mostrar error en consola si no es por longitud mínima
      const hasOtherErrors = error.errors.some(e => e.code !== 'too_small');
      if (hasOtherErrors) {
        console.error('Validación de búsqueda falló:', error.errors);
      }
    }
    return null;
  }
};

// Función para generar ID seguro desde título y artista
export const generateSafeId = (artist: string, title: string): string => {
  const sanitizedArtist = sanitizeString(artist);
  const sanitizedTitle = sanitizeString(title);
  
  return `${sanitizedArtist}-${sanitizedTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
    .substring(0, 100); // Limitar longitud
};

// Validar datos antes de enviar a Firebase
export const validateFirebaseData = (data: any): boolean => {
  // Verificar que no haya campos no permitidos
  const allowedFields = ['id', 'title', 'artist', 'album', 'duration', 'preview', 'votes', 'lastVotedAt'];
  const dataKeys = Object.keys(data);
  
  for (const key of dataKeys) {
    if (!allowedFields.includes(key)) {
      console.error(`Campo no permitido: ${key}`);
      return false;
    }
  }
  
  // Verificar tipos de datos
  if (typeof data.title !== 'string' || 
      typeof data.artist?.name !== 'string' ||
      typeof data.votes !== 'number') {
    console.error('Tipos de datos incorrectos');
    return false;
  }
  
  return true;
};