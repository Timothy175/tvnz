import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAl7ljECg3d6Shr6jSCaOZpItT3q5pklnE",
  authDomain: "tivanz.firebaseapp.com",
  projectId: "tivanz",
  storageBucket: "tivanz.firebasestorage.app",
  messagingSenderId: "975515506264",
  appId: "1:975515506264:web:a7e80ad5b876b7137adc2d",
  measurementId: "G-ZQGKXHH27X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
