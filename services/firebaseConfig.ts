import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * FIREBASE SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (e.g. "CricScorer")
 * 3. Add a "Web App" to your project
 * 4. Copy the `firebaseConfig` object provided by Firebase and paste it below
 * 5. In your Firebase Console, go to "Firestore Database" and click "Create Database"
 * 6. Set your rules to "Test Mode" (or public) for initial development
 */

const firebaseConfig = {
  apiKey: "AIzaSyBN2ryP645CEG49N2SjjGTjZWvNaLox7tg",
  authDomain: "cric-scorer-18.firebaseapp.com",
  projectId: "cric-scorer-18",
  storageBucket: "cric-scorer-18.firebasestorage.app",
  messagingSenderId: "895814065668",
  appId: "1:895814065668:web:0041291e475b86a5be5f51",
  measurementId: "G-Z7EF0HVBL5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
