const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDxLWGvYbH-8PpL3F9bOkqZHJDt_8YcNx0",
  authDomain: "topify-5e609.firebaseapp.com",
  projectId: "topify-5e609",
  storageBucket: "topify-5e609.firebasestorage.app",
  messagingSenderId: "1025756851346",
  appId: "1:1025756851346:web:f4c5e0a7c4e8c9b2a5d6f7"
};

async function checkFirestore() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('=== PLAYLIST ===');
  const playlistSnapshot = await getDocs(collection(db, 'playlist'));
  playlistSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Artist: ${data.artist}`);
    console.log(`Votes: ${data.votes}`);
    console.log('---');
  });
  
  console.log('=== VOTED SONGS ===');
  const votedSnapshot = await getDocs(collection(db, 'votedSongs'));
  console.log(`Total voted songs: ${votedSnapshot.size}`);
}

checkFirestore().catch(console.error);