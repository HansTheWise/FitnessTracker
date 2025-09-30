import { apiFetch, AuthError } from './api.js';

const CACHE_KEY = 'app_data_cache';

// Das In-Memory-Abbild des Caches für schnellen Zugriff.
let state = null;

/**
 * Schreibt den aktuellen In-Memory-State in den Session Storage,
 * um ihn bei einem Refresh der Seite wiederherstellen zu können.
 * @private
 */
const _commit = () => {
    if (state) {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(state));
    }
};

/**
 * Lädt die gesamten Anwendungsdaten vom neuen Backend-Endpunkt.
 * Dies sollte nur einmal pro Sitzung geschehen.
 * @private
 * @returns {Promise<object|null>} Die geladenen Daten oder null bei einem Fehler.
 */
const _fetchAndInitState = async () => {
    try {
        const data = await apiFetch('/api/tracking-data');
        state = {
            foods: data.foods || [],
            exercisetypes: data.exercise_types || [],
            consumptionlogs: data.consumption_logs || [],
            activitylogs: data.activity_logs || [],
            user_profile: data.user_profile || {},
        };
        _commit();
        console.log("State successfully fetched from server and cached.");
        return state;
    } catch (error) {
        console.error("Fatal: Could not fetch initial app data.", error);
        if (error instanceof AuthError) {
            // Leitet einen Logout ein, wenn die initialen Daten nicht geladen werden können.
            // Die Logout-Funktion wird in app.js definiert und global verfügbar gemacht.
            window.app.logout();
        }
        return null;
    }
};

export const StateService = {
    /**
     * Initialisiert den State. Versucht zuerst, ihn aus dem Session-Cache zu laden.
     * Wenn kein Cache vorhanden ist, werden die Daten vom Server geholt.
     * @returns {Promise<object>} Den initialisierten Anwendungsstatus.
     */
    async init() {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
            state = JSON.parse(cachedData);
            console.log("State initialized from cache.");
            return state;
        }
        return await _fetchAndInitState();
    },

    /**
     * Löscht den lokalen State und Cache. Wird beim Logout aufgerufen.
     */
    clear() {
        state = null;
        sessionStorage.removeItem(CACHE_KEY);
        console.log("State and cache cleared.");
    },

    /**
     * Gibt eine Kopie des gesamten aktuellen States zurück.
     * @returns {object|null} Der aktuelle State.
     */
    getState: () => state ? JSON.parse(JSON.stringify(state)) : null,

    /**
     * Gibt eine bestimmte Entitätenliste aus dem State zurück.
     * @param {string} entityName - Der Name der Entität (z.B. 'foods', 'activity_logs').
     * @returns {Array} Die Liste der Entitäten.
     */
    getEntity: (entityName) => state ? state[entityName] || [] : [],
    
    /**
     * Gibt das Benutzerprofil aus dem State zurück.
     * @returns {object} Das Benutzerprofil.
     */
    getProfile: () => state ? state.user_profile || {} : {},

    /**
     * Fügt ein neues Element zu einer Entitätenliste im State hinzu und speichert es im Cache.
     * @param {string} entityName - Der Name der Entität.
     * @param {object} item - Das hinzuzufügende Element.
     */
    addItem: (entityName, item) => {
        if (state && Array.isArray(state[entityName])) {
            state[entityName].push(item);
            _commit();
        }
    },

    /**
     * Aktualisiert ein vorhandenes Element in einer Entitätenliste und speichert es im Cache.
     * @param {string} entityName - Der Name der Entität.
     * @param {object} updatedItem - Das aktualisierte Element (muss eine 'id' haben).
     */
    updateItem: (entityName, updatedItem) => {
        if (state && Array.isArray(state[entityName])) {
            const index = state[entityName].findIndex(i => i.id === updatedItem.id);
            if (index !== -1) {
                state[entityName][index] = updatedItem;
                _commit();
            }
        }
    },
    
    /**
     * Aktualisiert das Benutzerprofil im State.
     * @param {object} updatedProfile - Das aktualisierte Profilobjekt.
     */
    updateProfile: (updatedProfile) => {
        if (state) {
            state.user_profile = updatedProfile;
            _commit();
        }
    },

    /**
     * Entfernt ein Element anhand seiner ID aus einer Entitätenliste und speichert es im Cache.
     * @param {string} entityName - Der Name der Entität.
     * @param {number|string} itemId - Die ID des zu entfernenden Elements.
     */
    deleteItem: (entityName, itemId) => {
        if (state && Array.isArray(state[entityName])) {
            // Wichtig: IDs können Zahlen oder Strings sein, daher '==' verwenden.
            state[entityName] = state[entityName].filter(i => i.id != itemId);
            _commit();
        }
    },
};
