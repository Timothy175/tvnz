// TP-Link EAP613 Configuration
const TPLINK_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_STAGES: [
    { duration: 5, unit: 'minutes' },
    { duration: 10, unit: 'minutes' },
    { duration: 24, unit: 'hours' }
  ],
  RATE_LIMIT: 2000,
  OPERATIONAL_HOURS: { start: 7, end: 18 }
};

// System State (per device fingerprint)
const fingerprint = btoa(navigator.userAgent);
let securityState = JSON.parse(localStorage.getItem(fingerprint)) || {
  attempts: 0,
  lockoutLevel: 0,
  lockoutUntil: null,
  lastAttempt: null
};

// DOM
const loginForm = document.getElementById("loginForm");
const statusMessage = document.getElementById("statusMessage");
const togglePassword = document.querySelector(".toggle-password");
const passwordInput = document.getElementById("password");
const csrfTokenInput = document.getElementById("csrfToken");

// Init
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupEvents();
  checkSecurityStatus();
  generateCSRFToken();
});

function updateDateTime() {
  const now = new Date();
  const d = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const t = now.toLocaleTimeString("en-US", { hour12: false });
  document.getElementById("dateDisplay").textContent = d;
  document.getElementById("timeDisplay").textContent = t;
}

function generateCSRFToken() {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  csrfTokenInput.value = token;
}

// Form handler
async function handleLogin(e) {
  e.preventDefault();
  if (!checkSecurity()) return;

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await fetch(loginForm.action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(loginForm))
    });

    const data = await res.json();
    if (data.success) {
      return handleSuccess();
    } else {
      handleFailedAttempt(data.message || "Authentication failed");
    }
  } catch (err) {
    handleFailedAttempt("Network error. Please try again");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Login";
  }
}

function handleSuccess() {
  resetSecurity();
  showMessage("Login berhasil! Redirecting...", "success");
  setTimeout(() => window.location.href = "/dashboard", 1500);
}

function handleFailedAttempt(msg) {
  securityState.attempts++;
  securityState.lastAttempt = Date.now();

  if (securityState.attempts >= TPLINK_CONFIG.MAX_ATTEMPTS) {
    escalateLockout();
  }

  updateSecurity();
  showMessage(msg || "Gagal login.", "error");
}

function escalateLockout() {
  securityState.lockoutLevel = Math.min(securityState.lockoutLevel + 1, TPLINK_CONFIG.LOCKOUT_STAGES.length - 1);
  const { duration, unit } = TPLINK_CONFIG.LOCKOUT_STAGES[securityState.lockoutLevel];
  const now = new Date();

  if (unit === "minutes") now.setMinutes(now.getMinutes() + duration);
  else now.setHours(now.getHours() + duration);

  securityState.lockoutUntil = now.getTime();
  securityState.attempts = 0;
}

function checkSecurity() {
  if (checkLockout()) return false;
  if (!checkRateLimit()) return false;
  return true;
}

function checkRateLimit() {
  const now = Date.now();
  if (securityState.lastAttempt && now - securityState.lastAttempt < TPLINK_CONFIG.RATE_LIMIT) {
    const delay = Math.ceil((TPLINK_CONFIG.RATE_LIMIT - (now - securityState.lastAttempt)) / 1000);
    showMessage(`Tunggu ${delay} detik sebelum mencoba lagi.`, "error");
    return false;
  }
  return true;
}

function checkLockout() {
  const now = Date.now();
  if (securityState.lockoutUntil && now < securityState.lockoutUntil) {
    const left = Math.ceil((securityState.lockoutUntil - now) / 60000);
    showMessage(`Terkunci. Coba lagi dalam ${left} menit.`, "error");
    return true;
  }
  return false;
}

function resetSecurity() {
  securityState = { attempts: 0, lockoutLevel: 0, lockoutUntil: null, lastAttempt: null };
  localStorage.removeItem(fingerprint);
}

function updateSecurity() {
  localStorage.setItem(fingerprint, JSON.stringify(securityState));
}

function checkSecurityStatus() {
  checkLockout();
  checkOperationalHours();
}

function checkOperationalHours() {
  const nowHour = new Date().getHours();
  if (nowHour < TPLINK_CONFIG.OPERATIONAL_HOURS.start || nowHour >= TPLINK_CONFIG.OPERATIONAL_HOURS.end) {
    loginForm.classList.add("disabled");
    showMessage("Akses hanya antara 07:00–18:00", "error");
  }
}

function showMessage(msg, type = "") {
  statusMessage.textContent = msg;
  statusMessage.className = `status-alert ${type}`;
}

function setupEvents() {
  loginForm.addEventListener("submit", handleLogin);
  togglePassword.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    togglePassword.classList.toggle("fa-eye-slash");
  });
}
