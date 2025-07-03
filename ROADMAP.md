# 🎵 TOPIFY - Plan de Desarrollo

## 📋 Descripción del Proyecto
Topify es una aplicación web de votación colaborativa de música que permite a los usuarios buscar canciones y votarlas para crear playlists compartidas. Utiliza Next.js, Firebase, y APIs de música (Last.fm e iTunes).

## 🚨 Estado Actual del Proyecto

### ✅ Características Implementadas
- Búsqueda de canciones con Last.fm e iTunes APIs
- Sistema de votación en tiempo real con Firebase
- Interfaz responsive con diseño glassmorphism
- Gestión de estado con Context API
- Paginación y loading skeletons
- Notificaciones toast

### ⚠️ Problemas Críticos Actuales
- API keys expuestas en el código fuente
- Sin autenticación real (usa fingerprinting vulnerable)
- Firebase sin reglas de seguridad
- Sin validación de inputs
- Sin límites de votación o rate limiting

## 🗺️ ROADMAP PRIORITIZADO

### 🔴 FASE 1: SEGURIDAD CRÍTICA (Implementar INMEDIATAMENTE)

#### 1. Proteger API Keys ✅
- [x] Crear archivo `.env.local`
- [x] Mover configuración de Firebase a variables de entorno
- [x] Mover Last.fm API key a variable de entorno
- [x] Actualizar `.gitignore` para excluir `.env.local`
- [x] Crear `.env.example` con estructura de variables

#### 2. Reglas de Seguridad Firebase ✅
- [x] Implementar reglas de Firestore:
  - Solo lectura pública para playlist
  - Validación estricta de estructura de datos
  - Votos incrementales de 1 en 1
  - Prevención de modificación de metadatos
- [x] Crear archivo `firestore.rules`
- [x] Configurar `firebase.json` para deployment
- [ ] Desplegar reglas a Firebase

#### 3. Validación y Sanitización ✅
- [x] Instalar librería de validación (zod) y sanitización (dompurify)
- [x] Crear esquemas de validación para:
  - Búsquedas de canciones
  - Datos de canciones antes de guardar
  - IDs seguros generados automáticamente
- [x] Implementar sanitización de HTML en títulos/artistas
- [x] Prevenir inyección de scripts con SafeInput component
- [x] Validar datos antes de enviar a Firebase

### 🟠 FASE 2: FUNCIONALIDADES ESENCIALES (1 semana)

#### 4. Sistema de Control Sin Autenticación ✅
- [x] Mejorar sistema de fingerprinting con UUID único
- [x] Implementar localStorage para tracking de votos
- [x] Crear sistema de identificación por dispositivo (DeviceTracker)
- [x] Implementar detección de navegación privada
- [x] Mostrar estado de votos en UI (VoteStatus component)

#### 5. Control de Votación ✅
- [x] Implementar límite de 1 voto por canción por dispositivo
- [x] Guardar votos en localStorage
- [x] Bloquear votación en modo privado/incógnito
- [x] Mensajes de error claros cuando no se puede votar

### 🟡 FASE 3: MEJORAS DE CALIDAD (2-3 semanas)

#### 7. Prevención de Duplicados ✅
- [x] Verificar antes de añadir canción:
  - Por ID único generado
  - Por título + artista con algoritmo de similitud (Levenshtein)
  - Detección fuzzy con 85% de umbral de similitud
- [x] Mostrar aviso específico si canción ya existe
- [x] Normalización de texto (acentos, caracteres especiales)

#### 8. Manejo de Errores Robusto ✅
- [x] Crear Error Boundary component
- [x] Implementar logging de errores en desarrollo
- [x] Mensajes de error user-friendly
- [x] Fallback UI para errores con diseño glassmorphism
- [x] Hook personalizado useErrorHandler
- [x] Manejo de errores en búsqueda con toast notifications

#### 9. TypeScript Estricto
- [ ] Habilitar strict mode en tsconfig.json
- [ ] Eliminar todos los tipos `any`
- [ ] Crear interfaces para:
  - Respuestas de API
  - Modelos de datos
  - Props de componentes
- [ ] Añadir tipos para Firebase

#### 10. Sistema de Caché
- [ ] Implementar React Query o SWR
- [ ] Cachear respuestas de búsqueda
- [ ] Invalidación inteligente de caché
- [ ] Persistencia en localStorage

### 🟢 FASE 4: OPTIMIZACIONES (Futuro)

#### 11. Testing Completo
- [ ] Configurar Jest + React Testing Library
- [ ] Tests unitarios para:
  - Componentes
  - Hooks personalizados
  - Utilidades
- [ ] Tests de integración
- [ ] Tests E2E con Cypress/Playwright

#### 12. Accesibilidad (A11y)
- [ ] Auditoría con axe-core
- [ ] Añadir ARIA labels
- [ ] Navegación por teclado
- [ ] Screen reader support
- [ ] Contraste de colores WCAG AA

#### 13. Optimización de Performance
- [ ] Implementar React.memo en componentes
- [ ] useMemo para cálculos costosos
- [ ] useCallback para funciones
- [ ] Lazy loading de componentes
- [ ] Optimización de imágenes con next/image
- [ ] Bundle splitting

#### 14. Panel de Administración
- [ ] Ruta `/admin` protegida
- [ ] Funcionalidades:
  - Ver estadísticas de votación
  - Eliminar canciones
  - Banear usuarios
  - Exportar playlist
- [ ] Dashboard con gráficos

## 📊 Métricas de Éxito
- Zero vulnerabilidades de seguridad críticas
- Tiempo de carga < 3 segundos
- 100% de cobertura en funciones críticas
- Score de Lighthouse > 90
- Cero errores no manejados en producción

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Auth)
- **APIs**: Last.fm, iTunes Search API
- **Estado**: Context API + useReducer
- **Hosting**: Vercel (recomendado)

## 📝 Notas de Implementación
1. Siempre crear branch para cada feature
2. Hacer PR con review antes de merge
3. Mantener commits atómicos y descriptivos
4. Actualizar este documento según avancemos
5. Documentar decisiones técnicas importantes

## 🚀 Próximos Pasos Inmediatos
1. Crear `.env.local` con las API keys
2. Implementar reglas de Firebase
3. Añadir validación básica de inputs
4. Configurar autenticación con Google

---
Última actualización: ${new Date().toLocaleDateString('es-ES')}