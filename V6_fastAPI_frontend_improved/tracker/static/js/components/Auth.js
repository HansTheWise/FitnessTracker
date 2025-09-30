import { api_fetch } from '../services/api.js';
import { show_toast } from '../ui.js';

let is_login_mode = true;
let _dom = {}; // Interner Verweis
let on_login_success = () => {};

/**
 * Toggles the view between login and registration modes.
 */
function toggle_auth_mode() {
    is_login_mode = !is_login_mode;
    _dom.auth.title.textContent = is_login_mode ? "Anmelden" : "Registrieren";
    _dom.auth.submit_button.textContent = is_login_mode ? "Anmelden" : "Registrieren";
    _dom.auth.toggle_link.textContent = is_login_mode ? "Noch kein Konto? Jetzt registrieren." : "Bereits ein Konto? Jetzt anmelden.";
    _dom.auth.error_div.textContent = "";
    _dom.auth.form.reset();
}

/**
 * Handles the submission of the authentication form.
 * @param {Event} e - The form submission event.
 */
async function handle_auth_submit(e) {
    e.preventDefault();
    _dom.auth.error_div.textContent = "";
    const email = _dom.auth.form.querySelector("#email").value;
    const password = _dom.auth.form.querySelector("#password").value;
    const endpoint = is_login_mode ? "/api/login" : "/api/register";

    try {
        const data = await api_fetch(endpoint, { method: "POST", body: { email, password } });
        if (is_login_mode) {
            localStorage.setItem("jwt_token", data.access_token);
            _dom.auth.form.reset();
            on_login_success();
        } else {
            show_toast(document.getElementById('toast-container'), "Registrierung erfolgreich! Bitte melden Sie sich an.");
            toggle_auth_mode();
        }
    } catch (error) {
        _dom.auth.error_div.textContent = error.message;
    }
}

export const Auth_Component = {
    /**
     * Initializes the Auth component, binds DOM elements and event listeners.
     * @param {object} dom - The main DOM object from app.js.
     * @param {Function} login_success_callback - The function to call after a successful login.
     */
    init: (dom, login_success_callback) => {
        // KORREKTUR: Wir übernehmen das dom-Objekt von app.js.
        _dom = dom;
        on_login_success = login_success_callback;
        
        // Die Elemente sind bereits durch rebindDynamicElements in dom.auth verfügbar.
        if (_dom.auth.toggle_link) _dom.auth.toggle_link.addEventListener("click", toggle_auth_mode);
        if (_dom.auth.form) _dom.auth.form.addEventListener("submit", handle_auth_submit);
        
        console.log("AuthComponent initialized.");
    }
};
