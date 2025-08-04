import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC5H7jtQPUEmsmjXeR3ZyBgB-YPNAaj1Nc", // Mets bien TA vraie clé ici
  authDomain: "geburtstag-app.firebaseapp.com",
  projectId: "geburtstag-app",
  storageBucket: "geburtstag-app.appspot.com",
  messagingSenderId: "336087594131",
  appId: "1:336087594131:web:1fbf78ff0cedbd1d914966",
  measurementId: "G-XJHNC8JC4N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);