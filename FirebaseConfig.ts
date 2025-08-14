// FirebaseConfig.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, doc, setDoc, getDoc, query, where } from 'firebase/firestore';

// Firebase config for nthomeapp
const firebaseConfig = {
  apiKey: "AIzaSyA78_auowszE7MsTqcHeMcQQurWdp8HIuo",
  authDomain: "nthomeapp-7da33.firebaseapp.com",
  projectId: "nthomeapp-7da33",
  storageBucket: "nthomeapp-7da33.appspot.com",
  messagingSenderId: "68267545029",
  appId: "1:68267545029:web:ee1092099328e9b1b8bbac",
};

// Initialize Firebase app with unique name
const app = getApps().find(a => a.name === "nthomeApp") || initializeApp(firebaseConfig, "nthomeApp");

// Initialize Auth with persistence in React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db, collection, doc, setDoc, getDoc, query, where };
