import { apiFetch, AuthError } from './api.js';
import { bindDOM, clearModalError, renderChart, showModalError, showToast, updateDashboardCards } from './ui.js';

/**
 * inistalisiert ein `state` objekt welches local alle wichtigen daten speichert
 * @returns {Object} state objekt wird zurück gegeben
 */
const getInitialState = () => ({
    isLoginMode: true, foods: [], exercisetypes: [], consumptionlogs: [], activitylogs: [], profile: {}, uiCache: {foodOptions: '', exerciseOptions: ''},
});

let state = getInitialState();

// --- DOM-Element-Referenzen ---
const dom = bindDOM();

const SELECT_OPTIONS_CONFIG = {
    'foods': {
        source: 'foods', // Woher die Daten im state kommen
        target: 'foodOptions' // Wohin der HTML-String im uiCache soll
    },
    'exercisetypes': {
        source: 'exercisetypes',
        target: 'exerciseOptions'
    }
};

/**
 * 
 * @param {String} entity nimmt einen entity name string entgegen nutzt dieses als key um im labels object nach dem key value paar zu suchen
 * @returns {String} returnt das Label für das entity oder default "Element" wenn kein key-value paar gefunden wurde
 */
function getEntityLabel(entity) {
    const labels = { foods: "Nahrungsmittel", exercisetypes: "Bewegungsform", consumptionlogs: "Konsum", activitylogs: "Aktivität" };
    return labels[entity] || "Element";
}
/**
 * füllt das `uiCache` objekt welches teil des `state`-objektes ist mit den html option strings für das select-element des modals
 */
function updateSelectOptions(entity) {
    const config = SELECT_OPTIONS_CONFIG[entity];
    if (!config) return; // Beendet die Funktion, wenn die Entität keine Optionen benötigt.

    const sourceData = state[config.source];
    if (sourceData) {
        state.uiCache[config.target] = sourceData.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    }
}

/**
 * Dient als Factory zur dynamischen Erzeugung des HTML-Markups für Formularfelder
 * innerhalb des Bearbeitungs-/Erstellungs-Modals.
 * Wählt basierend auf dem Entitätstyp das passende Set von Eingabefeldern aus.
 *
 * @param {string} entity Der Name der Entität (z.B. 'foods', 'consumptionlogs'),
 * für die das Formular-Markup generiert werden soll.
 * @returns {string} Eine HTML-Zeichenkette, die die <label>- und <input>-Elemente für das Formular enthält.
 * 
 * Für `consumptionlogs` und `activitylogs` werden select options aus dem `uiCache` des `state` objects entnommen
 */
function getFormFields(entity) {
    switch (entity) {
        case "foods": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / 100g</label><input type="number" id="form-calories_per_100g" class="form-control" required></div>`;
        case "exercisetypes": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / Stunde</label><input type="number" id="form-calories_per_hour" class="form-control" required></div>`;
        case "consumptionlogs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Nahrungsmittel</label><select id="form-food_id" class="form-select">${state.uiCache.foodOptions}</select></div><div class="mb-3"><label class="form-label">Menge (g)</label><input type="number" id="form-amount_g" class="form-control" required></div>`;
        case "activitylogs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Bewegung</label><select id="form-exercise_type_id" class="form-select">${state.uiCache.exerciseOptions}</select></div><div class="mb-3"><label class="form-label">Dauer (min)</label><input type="number" id="form-duration_min" class="form-control" required></div>`;
        default: return "";
    }
}

/**
 * setzt das frontend in seinen ausgangszustand zurück und löscht alle localen nutzerdaten
 */
function logout() {

    localStorage.removeItem("jwt_token");
    state = getInitialState();
    dom.views.auth.classList.remove("d-none");
    dom.views.app.classList.add("d-none");
    dom.auth.navSection.innerHTML = "";
    dom.auth.form.reset();
}

/**
 * sendet eine GET request mit der `apiFetch` funktion für einen entity type an den server, und sorgt dafür das das passende data-table custom element die daten erhält
 * wenn entity = `foods` oder `exercisetypes` so rufen wir die `updateSelectOptions` funktion auf um 
 * @param {string} entity 
 */
async function loadEntityData(entity) {
    try {
        const data = await apiFetch(`/api/${entity}`);
        state[entity] = data;

        if (entity in SELECT_OPTIONS_CONFIG) {
            updateSelectOptions(entity);
        }

        const table = document.querySelector(`data-table[entity="${entity}"]`);
        if (table) table.data = data;
    } catch (error) {
        if (error instanceof AuthError) logout();
        console.error(`Fehler beim Laden von ${entity}:`, error);
    }
}

async function loadProfileData() {
    try {
        const data = await apiFetch('/api/profile');
        state.profile = data;
        dom.profile.gender.value = data.gender || '';
        dom.profile.age.value = data.age || '';
        dom.profile.height.value = data.height_cm || '';
        dom.profile.weight.value = data.weight_kg || '';
        dom.profile.startDate.value = data.tracking_start_date || '';
    } catch (error) {
        if (error instanceof AuthError) logout();
        console.error("Fehler beim Laden des Profils:", error);
    }
}

async function loadAllData() {
    const entities = ["foods", "exercisetypes", "consumptionlogs", "activitylogs"];
    const dataLoadingPromises = entities.map(entity => loadEntityData(entity));
    dataLoadingPromises.push(loadProfileData());
    await Promise.all(dataLoadingPromises);
}

async function updateDashboard(period) {
    try {
        const data = await apiFetch(`/api/dashboard?period=${period}`);
        updateDashboardCards(dom.dashboard, data);
        renderChart(dom.dashboard.chartCanvas, data);
    } catch (error) {
        if (error instanceof AuthError) logout();
        console.error("Fehler beim Aktualisieren des Dashboards:", error);
    }
}

// --- Event Handler ---

function toggleAuthMode() {
    state.isLoginMode = !state.isLoginMode;
    dom.auth.title.textContent = state.isLoginMode ? "Anmelden" : "Registrieren";
    dom.auth.submitBtn.textContent = state.isLoginMode ? "Anmelden" : "Registrieren";
    dom.auth.toggleLink.textContent = state.isLoginMode ? "Noch kein Konto? Jetzt registrieren." : "Bereits ein Konto? Jetzt anmelden.";
    dom.auth.errorDiv.textContent = "";
    dom.auth.form.reset();
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = dom.auth.form.querySelector("#email").value;
    const password = dom.auth.form.querySelector("#password").value;
    const endpoint = state.isLoginMode ? "/api/login" : "/api/register";
    try {
        const data = await apiFetch(endpoint, { method: "POST", body: { email, password } });
        if (state.isLoginMode) {
            localStorage.setItem("jwt_token", data.access_token);
            dom.auth.form.reset();
            initializeApp();
        } else {
            showToast(dom.toastContainer, "Registrierung erfolgreich! Bitte melden Sie sich an.");
            toggleAuthMode();
            
        }
    } catch (error) {
        dom.auth.errorDiv.textContent = error.message;
    }
}

function handlePeriodChange(e) {
    if (e.target.tagName === "BUTTON") {
        dom.dashboard.periodSelector.querySelector(".active").classList.remove("active");
        e.target.classList.add("active");
        updateDashboard(e.target.dataset.period);
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    const payload = {
        gender: dom.profile.gender.value,
        age: dom.profile.age.value ? parseInt(dom.profile.age.value, 10) : null,
        height_cm: dom.profile.height.value ? parseInt(dom.profile.height.value, 10) : null,
        weight_kg: dom.profile.weight.value ? parseFloat(dom.profile.weight.value) : null,
        tracking_start_date: dom.profile.startDate.value || null
    };
    try {
        await apiFetch('/api/profile', { method: 'PUT', body: payload });
        showToast(dom.toastContainer, 'Profil erfolgreich gespeichert!');
        await loadProfileData();
        await updateDashboard(dom.dashboard.periodSelector.querySelector(".active").dataset.period);
    } catch (error) {
        if (error instanceof AuthError) logout();
        showToast(dom.toastContainer, `Fehler: ${error.message}`, 'danger');
    }
}

function getPayloadFromForm(entity) {
    const formFields = { foods: ["name", "calories_per_100g"], exercisetypes: ["name", "calories_per_hour"], consumptionlogs: ["log_date", "food_id", "amount_g"], activitylogs: ["log_date", "exercise_type_id", "duration_min"] };
    const payload = {};
    for (const field of formFields[entity]) {
        const input = document.getElementById(`form-${field}`);
        if (!input || !input.value) { 
            showModalError(dom.modal.element, "Bitte füllen Sie alle Felder aus.");
            return null; 
        }
        if (field.includes('_id')) { payload[field] = parseInt(input.value, 10); } 
        else if (input.type === "number") { payload[field] = parseFloat(input.value); } 
        else if (input.type === 'datetime-local') { payload[field] = new Date(input.value).toISOString(); }
        else { payload[field] = input.value; }
    }
    return payload;
}

function openModal(entity, id = null) {
    clearModalError(dom.modal.element);
    dom.modal.form.innerHTML = getFormFields(entity) + `<div class="modal-error-display alert alert-danger"></div>`;
    dom.modal.title.textContent = `${getEntityLabel(entity)} ${id ? "bearbeiten" : "hinzufügen"}`;

    if (id) {
        const item = state[entity].find((i) => i.id == id);
        Object.keys(item).forEach((key) => {
            const input = document.getElementById(`form-${key}`);
            if (input) {
                if (input.type === "datetime-local" && item[key]) {
                    const date = new Date(item[key]);
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    input.value = date.toISOString().slice(0, 16);
                } else {
                    input.value = item[key];
                }
            }
        });
    }

    dom.modal.saveBtn.onclick = () => saveItem(entity, id);
    dom.modal.instance.show();
}

async function saveItem(entity, id) {
    const payload = getPayloadFromForm(entity);
    if (!payload) return;
    
    const endpoint = id ? `/api/${entity}/${id}` : `/api/${entity}`;
    const method = id ? "PUT" : "POST";
    
    try {
        await apiFetch(endpoint, { method, body: payload });
        dom.modal.instance.hide();
        showToast(dom.toastContainer, `${getEntityLabel(entity)} erfolgreich gespeichert.`);
        await loadEntityData(entity);
        await updateDashboard(dom.dashboard.periodSelector.querySelector(".active").dataset.period);
    } catch (error) {
        if (error instanceof AuthError) logout();
        showModalError(dom.modal.element, error.message);
    }
}

async function deleteItem(entity, id) {
    if (confirm(`Sind Sie sicher, dass Sie dieses Element löschen möchten?`)) {
        try {
            await apiFetch(`/api/${entity}/${id}`, { method: "DELETE" });
            showToast(dom.toastContainer, `${getEntityLabel(entity)} wurde gelöscht.`);
            await loadEntityData(entity);
            await updateDashboard(dom.dashboard.periodSelector.querySelector(".active").dataset.period);
        } catch (error) {
            if (error instanceof AuthError) logout();
            showToast(dom.toastContainer, `Fehler: ${error.message}`, 'danger');
        }
    }
}

// --- Initialisierung der Anwendung ---

async function initializeApp() {
    dom.views.auth.classList.add("d-none");
    dom.auth.form.reset()
    dom.views.app.classList.remove("d-none");

    dom.auth.navSection.innerHTML = '';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline-danger';
    logoutBtn.textContent = 'Abmelden';
    logoutBtn.addEventListener('click', logout);
    dom.auth.navSection.appendChild(logoutBtn);
    
    await loadAllData();
    await updateDashboard("week");
}

function checkInitialAuth() {
    if (localStorage.getItem("jwt_token")) {
        initializeApp();
    }
}

function addEventListeners() {
    dom.auth.toggleLink.addEventListener("click", toggleAuthMode);
    dom.auth.form.addEventListener("submit", handleAuthSubmit);
    dom.dashboard.periodSelector.addEventListener("click", handlePeriodChange);
    dom.profile.form.addEventListener("submit", handleProfileSubmit);

    document.querySelectorAll('[data-action="open-modal"]').forEach(button => {
        button.addEventListener('click', () => openModal(button.dataset.entity));
    });

    document.querySelectorAll("data-table").forEach((table) => {
        const entity = table.getAttribute("entity");
        table.addEventListener("edit", (e) => openModal(entity, e.detail.id));
        table.addEventListener("delete", (e) => deleteItem(entity, e.detail.id));
    });
}

// --- App Startup ---
addEventListeners();
checkInitialAuth();

