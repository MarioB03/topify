const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2pMa7t9-JL5VxaHWLCYKy_zI1lIVsQa8",
  authDomain: "topify-5e609.firebaseapp.com",
  projectId: "topify-5e609",
  storageBucket: "topify-5e609.firebasestorage.app",
  messagingSenderId: "774896725899",
  appId: "1:774896725899:web:2c6e29d72b3e05ad31fa68"
};

// Función para buscar canciones en iTunes (igual que en la app)
async function searchiTunesTrack(title, artist) {
  try {
    const itunesResponse = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&media=music&entity=song&limit=1`
    );
    
    if (itunesResponse.ok) {
      const itunesData = await itunesResponse.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const itunesTrack = itunesData.results[0];
        return itunesTrack.previewUrl || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching iTunes:', error);
    return null;
  }
}

async function addPreviewsToExistingSongs() {
  try {
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('🎵 Iniciando actualización de previews...');

    // Obtener todas las canciones de la colección
    const playlistRef = collection(db, 'playlist');
    const snapshot = await getDocs(playlistRef);

    console.log(`📊 Encontradas ${snapshot.size} canciones en total`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const song = docSnapshot.data();
      const songId = docSnapshot.id;

      // Verificar si ya tiene preview
      if (song.preview) {
        console.log(`⏭️  Saltando "${song.title}" - ya tiene preview`);
        skippedCount++;
        continue;
      }

      console.log(`🔍 Buscando preview para: "${song.title}" by ${song.artist}`);

      try {
        // Buscar preview en iTunes
        const previewUrl = await searchiTunesTrack(song.title, song.artist);

        if (previewUrl) {
          // Actualizar el documento en Firestore
          const songRef = doc(db, 'playlist', songId);
          await updateDoc(songRef, {
            preview: previewUrl
          });

          console.log(`✅ Preview añadido para: "${song.title}"`);
          updatedCount++;
        } else {
          // Añadir preview como null si no se encuentra
          const songRef = doc(db, 'playlist', songId);
          await updateDoc(songRef, {
            preview: null
          });

          console.log(`❌ No se encontró preview para: "${song.title}"`);
          updatedCount++;
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`💥 Error procesando "${song.title}":`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Resumen de la actualización:');
    console.log(`✅ Canciones actualizadas: ${updatedCount}`);
    console.log(`⏭️  Canciones saltadas (ya tenían preview): ${skippedCount}`);
    console.log(`💥 Errores: ${errorCount}`);
    console.log(`📊 Total procesado: ${updatedCount + skippedCount + errorCount}`);

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar el script
addPreviewsToExistingSongs();