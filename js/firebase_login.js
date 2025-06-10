import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("firebaseLoginForm");
  const statusMessage = document.getElementById("statusMessage");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (username.includes("@")) {
      statusMessage.textContent = "Cukup masukkan username tanpa @tivanbm.com";
      statusMessage.className = "status-alert error";
      return;
    }

    const email = `${username}@tivanbm.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Ambil data dari URL captive portal
      const url = new URL(window.location.href);
      const gw = url.searchParams.get("gw_address");
      const port = url.searchParams.get("gw_port");
      const mac = url.searchParams.get("clientmac");
      const ip = url.searchParams.get("clientip");

      // Simpan log ke Firestore
      await setDoc(doc(db, "wifi_logs", `${user.uid}-${Date.now()}`), {
        uid: user.uid,
        email: user.email,
        mac,
        ip,
        loginTime: new Date().toISOString()
      });

      // Beri akses ke internet
      const redirectURL = `http://${gw}:${port}/portal/auth?clientMac=${mac}`;
      await fetch(redirectURL, { method: "GET", mode: "no-cors" });

      statusMessage.textContent = "Login berhasil! Redirecting...";
      statusMessage.className = "status-alert success";

      setTimeout(() => {
        window.location.href = "/success.html";
      }, 1500);
    } catch (err) {
      statusMessage.textContent = "Login gagal: " + err.message;
      statusMessage.className = "status-alert error";
    }
  });
});
