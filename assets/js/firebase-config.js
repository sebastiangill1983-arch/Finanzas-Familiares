// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================
// 1. Andá a https://console.firebase.google.com
// 2. Creá un proyecto nuevo (o usá uno existente, como el de SinTACC)
// 3. Agregá una app web (ícono </>)
// 4. Copiá el objeto firebaseConfig que te da Firebase y pegalo acá abajo
// 5. En la consola de Firebase, activá:
//    - Authentication > Sign-in method > Email/Password
//    - Firestore Database > Crear base de datos (modo producción)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxbpxfwS-RNQwMf8LL0H1pw78WpgH_9h4",
  authDomain: "finanzas-familiares-72c41.firebaseapp.com",
  projectId: "finanzas-familiares-72c41",
  storageBucket: "finanzas-familiares-72c41.firebasestorage.app",
  messagingSenderId: "821932190101",
  appId: "1:821932190101:web:ab8fb65f7bd770046b2e9c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
