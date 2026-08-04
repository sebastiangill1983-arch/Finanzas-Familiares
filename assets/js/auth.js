import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const switchBtn = document.getElementById("switch-btn");
const switchText = document.getElementById("switch-text");
const msg = document.getElementById("form-msg");

let mode = "login"; // "login" | "signup"

function setMsg(text, type) {
  msg.textContent = text;
  msg.className = "form-msg" + (type ? " " + type : "");
}

switchBtn.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  submitBtn.textContent = mode === "login" ? "Ingresar" : "Crear cuenta";
  switchText.textContent = mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?";
  switchBtn.textContent = mode === "login" ? "Crear cuenta" : "Ingresar";
  setMsg("", null);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  submitBtn.disabled = true;
  setMsg("", null);

  try {
    if (mode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "app.html";
  } catch (err) {
    setMsg(traducirError(err.code), "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Si ya hay sesión activa, redirigir directo al dashboard
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("index.html")) {
    // no redirigir automáticamente para permitir cambiar de cuenta desde acá
  }
});

function traducirError(code) {
  const errores = {
    "auth/invalid-email": "El email no es válido.",
    "auth/user-not-found": "No existe una cuenta con ese email.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Email o contraseña incorrectos.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  };
  return errores[code] || "Ocurrió un error. Probá de nuevo.";
}
