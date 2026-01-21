import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDfVWxMTlXI6ut2NmImtDNh7grH7KF9_Bg",
  authDomain: "doc-scanner-app-943ca.firebaseapp.com",
  projectId: "doc-scanner-app-943ca",
  storageBucket: "doc-scanner-app-943ca.firebasestorage.app",
  messagingSenderId: "397752201405",
  appId: "1:397752201405:web:4bf683c2eebe9baad407d4",
  measurementId: "G-EH0ZPSRVWL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);