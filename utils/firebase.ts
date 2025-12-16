import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, remove, query, limitToLast } from 'firebase/database';
import { Decoration } from '../types';

// --- USER CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBBvpjPAHFyyyo1lV7gEpmDSILWirMmsaU",
  authDomain: "noel-69fa9.firebaseapp.com",
  databaseURL: "https://noel-69fa9-default-rtdb.firebaseio.com",
  projectId: "noel-69fa9",
  storageBucket: "noel-69fa9.firebasestorage.app",
  messagingSenderId: "98033284914",
  appId: "1:98033284914:web:1d4a0b56d52f4da611c92b",
  measurementId: "G-2YTX9HWK43"
};

// 1. Initialize Firebase
let app;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export { db };

// 2. Helper Functions

// Listen to changes in the 'decorations' node
export const subscribeToDecorations = (callback: (data: Decoration[]) => void) => {
  if (!db) {
    console.warn("Database not initialized, returning empty list.");
    callback([]);
    return () => {};
  }

  const decorationsRef = ref(db, 'decorations');
  
  // PERFORMANCE OPTIMIZATION:
  // Only fetch the last 50 items to prevent the scene from becoming too heavy
  // as the database grows over time.
  const recentDecorationsQuery = query(decorationsRef, limitToLast(50));
  
  // onValue returns the unsubscribe function directly
  const unsubscribe = onValue(recentDecorationsQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert Object map to Array
      const loadedDecorations = Object.values(data) as Decoration[];
      callback(loadedDecorations);
    } else {
      callback([]); // Return empty array if DB is empty
    }
  }, (error) => {
    console.error("Firebase Read Error:", error);
  });

  // Return unsubscribe function
  return unsubscribe;
};

// Add a new decoration
export const addDecorationToDB = (decoration: Decoration) => {
  if (!db) {
    console.error("Cannot write to database: DB not initialized.");
    return;
  }
  const decorationsRef = ref(db, 'decorations');
  const newDecRef = push(decorationsRef); // Create a new unique ID
  
  // Save the decoration object
  set(newDecRef, decoration).catch((error) => {
    console.error("Firebase Write Error:", error);
  });
};

// Reset/Clear all decorations (Nuclear option)
export const resetDecorationsInDB = () => {
  if (!db) return;
  const decorationsRef = ref(db, 'decorations');
  remove(decorationsRef);
};