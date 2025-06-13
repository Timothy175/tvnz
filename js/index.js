// TP-Link EAP613 Configuration
const TPLINK_CONFIG = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_STAGES: [
        { duration: 5, unit: 'minutes' },
        { duration: 10, unit: 'minutes' },
        { duration: 24, unit: 'hours' }
    ],
    RATE_LIMIT: 2000,
    OPERATIONAL_HOURS: {
        start: 7,
        end: 18
    }
};

// System State
let securityState = {
    attempts: parseInt(localStorage.getItem('loginAttempts')) || 0,
    lockoutLevel: parseInt(localStorage.getItem('lockoutLevel')) || 0,
    lockoutUntil: parseInt(localStorage.getItem('lockoutUntil')),
    lastAttempt: parseInt(localStorage.getItem('lastAttempt'))
};

// DOM Elements
const loginForm = document.getElementById("firebaseLoginForm");
const statusMessage = document.getElementById("statusMessage");
const togglePassword = document.querySelector('.toggle-password');
const passwordInput = document.getElementById('password');
const csrfTokenInput = document.getElementById('csrfToken');

// Initialize System
function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    checkSecurityStatus();
    generateCSRFToken();
}

// Generate CSRF Token for TP-Link EAP613
function generateCSRFToken() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    csrfTokenInput.value = token;
}

// Enhanced DateTime Display
function updateDateTime() {
    const now = new Date();
    const dateOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    };
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    
    document.getElementById('dateDisplay').textContent = 
        new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    document.getElementById('timeDisplay').textContent = 
        now.toLocaleTimeString('en-US', timeOptions);
}

// Security Functions
function handleLogin(e) {
    e.preventDefault();
    
    if(!checkSecurity()) return;
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    
    fetch(loginForm.action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(new FormData(loginForm))
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            handleSuccess();
        } else {
            handleFailedAttempt(data.message || 'Authentication failed');
        }
    })
    .catch(() => {
        handleFailedAttempt('Network error. Please try again');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    });
}

function checkSecurity() {
    if(checkLockStatus()) return false;
    if(checkRateLimit()) return true;
    
    showMessage('Please wait before trying again', 'error');
    return false;
}

function checkLockStatus() {
    if(!securityState.lockoutUntil) return false;
    
    const now = Date.now();
    if(now < securityState.lockoutUntil) {
        const remaining = Math.ceil((securityState.lockoutUntil - now) / 60000);
        showMessage(`Account locked. Try again in ${remaining} minutes`, 'error');
        return true;
    }
    
    resetSecurityState();
    return false;
}

function checkRateLimit() {
    const now = Date.now();
    if(securityState.lastAttempt && 
       (now - securityState.lastAttempt < TPLINK_CONFIG.RATE_LIMIT)) {
        startCountdown(TPLINK_CONFIG.RATE_LIMIT - (now - securityState.lastAttempt));
        return false;
    }
    return true;
}

function startCountdown(duration) {
    let remaining = Math.ceil(duration / 1000);
    const countdown = setInterval(() => {
        showMessage(`Please wait ${remaining--} seconds...`, 'error');
        if(remaining < 0) {
            clearInterval(countdown);
            statusMessage.textContent = '';
        }
    }, 1000);
}

function handleFailedAttempt(message) {
    securityState.attempts++;
    securityState.lastAttempt = Date.now();
    
    if(securityState.attempts >= TPLINK_CONFIG.MAX_ATTEMPTS) {
        escalateLockout();
    }
    
    updateSecurityState();
    showMessage(message || `Login failed. Attempts: ${securityState.attempts}`, 'error');
}

function escalateLockout() {
    securityState.lockoutLevel = Math.min(
        securityState.lockoutLevel + 1, 
        TPLINK_CONFIG.LOCKOUT_STERS.length - 1
    );
    
    const { duration, unit } = TPLINK_CONFIG.LOCKOUT_STAGES[securityState.lockoutLevel];
    const lockoutTime = new Date();
    
    unit === 'minutes' 
        ? lockoutTime.setMinutes(lockoutTime.getMinutes() + duration)
        : lockoutTime.setHours(lockoutTime.getHours() + duration);
    
    securityState.lockoutUntil = lockoutTime.getTime();
    securityState.attempts = 0;
    updateSecurityState();
}

function handleSuccess() {
    resetSecurityState();
    showMessage('Login successful! Redirecting...', 'success');
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 1500);
}

function resetSecurityState() {
    securityState = { attempts: 0, lockoutLevel: 0, lockoutUntil: null, lastAttempt: null };
    localStorage.clear();
}

function updateSecurityState() {
    localStorage.setItem('loginAttempts', securityState.attempts);
    localStorage.setItem('lockoutLevel', securityState.lockoutLevel);
    localStorage.setItem('lockoutUntil', securityState.lockoutUntil);
    localStorage.setItem('lastAttempt', securityState.lastAttempt);
}

function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-alert ${type === 'error' ? 'error' : ''}`;
}

function checkSecurityStatus() {
    checkLockStatus();
    checkOperationalHours();
}

function checkOperationalHours() {
    const now = new Date().getHours();
    if(now < TPLINK_CONFIG.OPERATIONAL_HOURS.start || 
       now >= TPLINK_CONFIG.OPERATIONAL_HOURS.end) {
        loginForm.classList.add('disabled');
        showMessage('System available 07:00 - 18:00', 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.classList.toggle('fa-eye-slash');
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', init);