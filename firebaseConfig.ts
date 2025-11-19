// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsiUZmdPxsSoNd3T_6IkzHeYBZ--0-VDE",
  authDomain: "login-site-ed3ed.firebaseapp.com",
  projectId: "login-site-ed3ed",
  storageBucket: "login-site-ed3ed.firebasestorage.app",
  messagingSenderId: "169570596929",
  appId: "1:169570596929:web:3b3ed84373d83d0736eec0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth using the recommended getAuth()
const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db, app };