import { useState, useEffect } from 'react';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDxLWGvYbH-8PpL3F9bOkqZHJDt_8YcNx0",
  authDomain: "topify-5e609.firebaseapp.com",
  projectId: "topify-5e609",
  storageBucket: "topify-5e609.firebasestorage.app",
  messagingSenderId: "1025756851346",
  appId: "1:1025756851346:web:f4c5e0a7c4e8c9b2a5d6f7"
};

export const useFirebase = () => {
  const [firestore, setFirestore] = useState(null);
  const [firestoreUtils, setFirestoreUtils] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { 
          getFirestore, 
          collection, 
          addDoc, 
          getDocs, 
          updateDoc, 
          doc, 
          deleteDoc, 
          query, 
          orderBy, 
          where 
        } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        setFirestore(db);
        setFirestoreUtils({
          collection,
          addDoc,
          getDocs,
          updateDoc,
          doc,
          deleteDoc,
          query,
          orderBy,
          where
        });
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
      }
    };

    initFirebase();
  }, []);

  return { firestore, firestoreUtils, isReady };
};