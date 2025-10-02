import { api_fetch, Auth_Error } from '../services/api.js';
import { State_Service } from '../services/State_Service.js';
import { show_toast } from '../ui.js';

let _updateDashboard;
let _dom = {}; // Interner Verweis

/**
 * Populates the profile form with data from the StateService.
 */
function populate_profile_form() {
    const profile = State_Service.get_local_profile();
    if (!profile || !_dom.profile.form) return;
    _dom.profile.gender.value = profile.gender || '';
    _dom.profile.age.value = profile.age || '';
    _dom.profile.height.value = profile.height_cm || '';
    _dom.profile.weight.value = profile.weight_kg || '';
    _dom.profile.start_date.value = profile.tracking_start_date || '';
    _dom.profile.balance_goal.value = profile.balance_goal_kcal || '';
}

/**
 * Handles the submission of the profile update form.
 */
async function handle_profile_submit(e) {
    e.preventDefault();
    const payload = {
        gender: _dom.profile.gender.value,
        age: _dom.profile.age.value ? parseInt(_dom.profile.age.value, 10) : null,
        height_cm: _dom.profile.height.value ? parseInt(_dom.profile.height.value, 10) : null,
        weight_kg: _dom.profile.weight.value ? parseFloat(_dom.profile.weight.value) : null,
        tracking_start_date: _dom.profile.start_date.value || null,
        balance_goal_kcal: _dom.profile.balance_goal.value ? parseInt(_dom.profile.balance_goal.value, 10) : null
    };

    try {
        const updated_profile = await api_fetch('/api/profile', { method: 'PUT', body: payload });
        State_Service.update_local_profile(updated_profile); // Update state locally
        show_toast(_dom.toast_container, 'Profil erfolgreich gespeichert!');
        
        const active_period = document.querySelector("#period-selector .active").dataset.period;
        _updateDashboard(active_period);

    } catch (error) {
        if (error instanceof Auth_Error) return window.app.logout();
        show_toast(_dom.toast_container, `Fehler: ${error.message}`, 'danger');
    }
}

export const Profile_Component = {
    /**
     * Initializes the Profile component.
     * @param {object} dom - The main DOM object from app.js.
     * @param {Function} update_dashboard_callback - A reference to the main updateDashboard function.
     */
    init: (dom, update_dashboard_callback) => {
        // KORREKTUR: Wir übernehmen das dom-Objekt von app.js
        _dom = dom;
        _updateDashboard = update_dashboard_callback;
        
        if (_dom.profile.form) {
            _dom.profile.form.addEventListener("submit", handle_profile_submit);
            populate_profile_form();
            console.log("ProfileComponent initialized.");
        }
    }
};
