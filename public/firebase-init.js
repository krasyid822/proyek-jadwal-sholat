// firebase-init.js

// Konfigurasi Firebase Anda yang sudah benar
const firebaseConfig = {
  apiKey: "AIzaSyDrVlBSGKSvSc6OwZeK6bBWZYD3Jo1IdgA",
  authDomain: "pwa-jadwal-sholat.firebaseapp.com",
  projectId: "pwa-jadwal-sholat",
  storageBucket: "pwa-jadwal-sholat.firebasestorage.app",
  messagingSenderId: "381696407215",
  appId: "1:381696407215:web:684f64f27ab78e32ad865a"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
const db = firebase.firestore();