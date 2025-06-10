import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("firebaseLoginForm");
  const statusMessage = document.getElementById("statusMessage");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username.includes("@")) {
      statusMessage.textContent = "Cukup masukkan username tanpa @tivanbm.com";
      statusMessage.className = "status-alert error";
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      statusMessage.textContent = "Username tidak valid.";
      statusMessage.className = "status-alert error";
      return;
    }

    const email = `${username}@tivanbm.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Ambil parameter dari URL captive portal
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

      // Kirim request ke gateway captive portal
      const redirectURL = `http://${gw}:${port}/portal/auth?clientMac=${mac}`;
      await fetch(redirectURL, { method: "GET", mode: "no-cors" });

      statusMessage.textContent = "Login berhasil! Mengalihkan...";
      statusMessage.className = "status-alert success";

      setTimeout(() => {
        window.location.href = "/success.html";
      }, 1500);
    } catch (err) {
      let msg = "Login gagal.";
      if (err.code === "auth/user-not-found") msg = "Akun tidak ditemukan.";
      else if (err.code === "auth/wrong-password") msg = "Password salah.";
      else if (err.code === "auth/too-many-requests") msg = "Terlalu banyak percobaan. Coba lagi nanti.";
      else msg = "Error: " + err.message;

      statusMessage.textContent = msg;
      statusMessage.className = "status-alert error";
    }
  });
});
