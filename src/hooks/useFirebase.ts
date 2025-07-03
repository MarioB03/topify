import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  Firestore
} from 'firebase/firestore';
import { FirestoreUtils } from '../types/firebase';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID']
};

export const useFirebase = () => {
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [firestoreUtils, setFirestoreUtils] = useState<FirestoreUtils | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initFirebase = async () => {
      try {
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
        } as FirestoreUtils);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
      }
    };

    initFirebase();
  }, []);

  return { firestore, firestoreUtils, isReady };
};