# Topify 🎵

Una aplicación web para votar canciones y crear playlists colaborativas.

## Características

- 🔍 Búsqueda de canciones usando la API de Deezer
- 🗳️ Sistema de votación para canciones
- 📊 Playlist ordenada por número de votos
- 💾 Persistencia local de datos
- 📱 Diseño responsive

## Instalación y uso

1. **Clonar o descargar los archivos**
   ```
   index.html
   styles.css
   script.js
   server.py
   ```

2. **Iniciar el servidor local** (necesario para evitar problemas de CORS):
   ```bash
   python3 server.py
   ```

3. **Abrir la aplicación**:
   Ve a `http://localhost:8000` en tu navegador

## Cómo funciona

1. **Buscar música**: Escribe el título de una canción o nombre de artista
2. **Votar**: Haz clic en "Votar" en las canciones que te gusten
3. **Ver playlist**: Las canciones aparecen ordenadas por votos en la sección "Playlist actual"
4. **Persistencia**: Tus votos se guardan automáticamente en el navegador

## API utilizada

- **Deezer API**: Para búsqueda de canciones, artistas y carátulas de álbumes
- Gratuita y sin límites estrictos
- Proporciona metadatos completos de música

## Tecnologías

- HTML5, CSS3, JavaScript ES6+
- Python 3 (servidor proxy)
- API REST de Deezer
- Local Storage para persistencia

## Estructura del proyecto

```
topify/
├── index.html      # Página principal
├── styles.css      # Estilos
├── script.js       # Lógica de la aplicación
├── server.py       # Servidor proxy para CORS
└── README.md       # Documentación
```