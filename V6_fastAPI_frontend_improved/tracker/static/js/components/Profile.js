import { apiFetch, AuthError } from '../services/api.js';
import { StateService } from '../services/StateService.js';
import { showToast } from '../ui.js';

let _updateDashboard;
let _dom = {}; // Interner Verweis

/**
 * Populates the profile form with data from the StateService.
 */
function populateProfileForm() {
    const profile = StateService.getProfile();
    if (!profile || !_dom.profile.form) return;
    _dom.profile.gender.value = profile.gender || '';
    _dom.profile.age.value = profile.age || '';
    _dom.profile.height.value = profile.height_cm || '';
    _dom.profile.weight.value = profile.weight_kg || '';
    _dom.profile.startDate.value = profile.tracking_start_date || '';
    _dom.profile.balanceGoal.value = profile.balance_goal_kcal || '';
}

/**
 * Handles the submission of the profile update form.
 */
async function handleProfileSubmit(e) {
    e.preventDefault();
    const payload = {
        gender: _dom.profile.gender.value,
        age: _dom.profile.age.value ? parseInt(_dom.profile.age.value, 10) : null,
        height_cm: _dom.profile.height.value ? parseInt(_dom.profile.height.value, 10) : null,
        weight_kg: _dom.profile.weight.value ? parseFloat(_dom.profile.weight.value) : null,
        tracking_start_date: _dom.profile.startDate.value || null,
        balance_goal_kcal: _dom.profile.balanceGoal.value ? parseInt(_dom.profile.balanceGoal.value, 10) : null
    };

    try {
        const updatedProfile = await apiFetch('/api/profile', { method: 'PUT', body: payload });
        StateService.updateProfile(updatedProfile); // Update state locally
        showToast(_dom.toastContainer, 'Profil erfolgreich gespeichert!');
        
        const activePeriod = document.querySelector("#period-selector .active").dataset.period;
        _updateDashboard(activePeriod);

    } catch (error) {
        if (error instanceof AuthError) return window.app.logout();
        showToast(_dom.toastContainer, `Fehler: ${error.message}`, 'danger');
    }
}

export const ProfileComponent = {
    /**
     * Initializes the Profile component.
     * @param {object} dom - The main DOM object from app.js.
     * @param {Function} updateDashboardCallback - A reference to the main updateDashboard function.
     */
    init: (dom, updateDashboardCallback) => {
        // KORREKTUR: Wir übernehmen das dom-Objekt von app.js
        _dom = dom;
        _updateDashboard = updateDashboardCallback;
        
        if (_dom.profile.form) {
            _dom.profile.form.addEventListener("submit", handleProfileSubmit);
            populateProfileForm();
            console.log("ProfileComponent initialized.");
        }
    }
};
