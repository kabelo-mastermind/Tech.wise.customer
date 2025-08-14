// Import the functions you need from the SDKs you need
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCtY0pPbjt6DlGnZMIiFaUO8zRwJcNJlM",
  authDomain: "voice-recording-app-2ed9b.firebaseapp.com",
  projectId: "voice-recording-app-2ed9b",
  storageBucket: "voice-recording-app-2ed9b.appspot.com",
  messagingSenderId: "475610196824",
  appId: "1:475610196824:web:b5b2bdaa100f94c61cd32d",
  measurementId: "G-Z80XTQHKH7"
};

// Initialize Firebase app (singleton pattern)
const app: FirebaseApp = getApps().find(a => a.name === "storageApp") || initializeApp(firebaseConfig, "storageApp");

// Initialize services
// const analytics: Analytics = getAnalytics(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { storage, db};
