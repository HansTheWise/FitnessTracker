import { apiFetch } from '../services/api.js';
import { showToast } from '../ui.js';

let isLoginMode = true;
let _dom = {}; // Interner Verweis
let onLoginSuccess = () => {};

/**
 * Toggles the view between login and registration modes.
 */
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    _dom.auth.title.textContent = isLoginMode ? "Anmelden" : "Registrieren";
    _dom.auth.submitBtn.textContent = isLoginMode ? "Anmelden" : "Registrieren";
    _dom.auth.toggleLink.textContent = isLoginMode ? "Noch kein Konto? Jetzt registrieren." : "Bereits ein Konto? Jetzt anmelden.";
    _dom.auth.errorDiv.textContent = "";
    _dom.auth.form.reset();
}

/**
 * Handles the submission of the authentication form.
 * @param {Event} e - The form submission event.
 */
async function handleAuthSubmit(e) {
    e.preventDefault();
    _dom.auth.errorDiv.textContent = "";
    const email = _dom.auth.form.querySelector("#email").value;
    const password = _dom.auth.form.querySelector("#password").value;
    const endpoint = isLoginMode ? "/api/login" : "/api/register";

    try {
        const data = await apiFetch(endpoint, { method: "POST", body: { email, password } });
        if (isLoginMode) {
            localStorage.setItem("jwt_token", data.access_token);
            _dom.auth.form.reset();
            onLoginSuccess();
        } else {
            showToast(document.getElementById('toast-container'), "Registrierung erfolgreich! Bitte melden Sie sich an.");
            toggleAuthMode();
        }
    } catch (error) {
        _dom.auth.errorDiv.textContent = error.message;
    }
}

export const AuthComponent = {
    /**
     * Initializes the Auth component, binds DOM elements and event listeners.
     * @param {object} dom - The main DOM object from app.js.
     * @param {Function} loginSuccessCallback - The function to call after a successful login.
     */
    init: (dom, loginSuccessCallback) => {
        // KORREKTUR: Wir übernehmen das dom-Objekt von app.js.
        _dom = dom;
        onLoginSuccess = loginSuccessCallback;
        
        // Die Elemente sind bereits durch rebindDynamicElements in dom.auth verfügbar.
        if (_dom.auth.toggleLink) _dom.auth.toggleLink.addEventListener("click", toggleAuthMode);
        if (_dom.auth.form) _dom.auth.form.addEventListener("submit", handleAuthSubmit);
        
        console.log("AuthComponent initialized.");
    }
};
