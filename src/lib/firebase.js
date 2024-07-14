import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database"; // Import Realtime Database

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "chat-app-29f36.firebaseapp.com",
  databaseUrl: "https://chat-app-29f36-default-rtdb.firebaseio.com",
  projectId: "chat-app-29f36",
  storageBucket: "chat-app-29f36.appspot.com",
  messagingSenderId: "132572079700",
  appId: "1:132572079700:web:0ce7e78bebfc3030b1efc1"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth()
export const db = getFirestore()
export const storage = getStorage()
export const realtimeDb = getDatabase(app); // Export Realtime Database