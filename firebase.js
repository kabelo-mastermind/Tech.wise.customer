// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCtY0pPbjt6DlGnZMIiFaUO8zRwJcNJlM",
  authDomain: "voice-recording-app-2ed9b.firebaseapp.com",
  projectId: "voice-recording-app-2ed9b",
  storageBucket: "voice-recording-app-2ed9b.appspot.com",
  messagingSenderId: "475610196824",
  appId: "1:475610196824:web:b5b2bdaa100f94c61cd32d",
  measurementId: "G-Z80XTQHKH7"
};

// Initialize Firebase
// Give this Firebase instance a unique name (e.g., "storageApp")
const app = getApps().find((a) => a.name === "storageApp") || initializeApp(firebaseConfig, "storageApp");
const analytics = getAnalytics(app);
const db = getFirestore(app)
const storage = getStorage(app)

export {storage, db, analytics}