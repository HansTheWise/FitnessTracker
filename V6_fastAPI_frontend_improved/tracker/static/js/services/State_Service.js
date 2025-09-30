import { api_fetch, Auth_Error } from './api.js';

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
const _fetch_and_init_local_state = async () => {
    try {
        const data = await api_fetch('/api/tracking-data');
        state = {
            foods: data.foods || [],
            exercise_types: data.exercise_types || [],
            consumption_logs: data.consumption_logs || [],
            activity_logs: data.activity_logs || [],
            user_profile: data.user_profile || {},
        };
        _commit();
        console.log("State successfully fetched from server and cached.");
        return state;
    } catch (error) {
        console.error("Fatal: Could not fetch initial app data.", error);
        if (error instanceof Auth_Error) {
            // Leitet einen Logout ein, wenn die initialen Daten nicht geladen werden können.
            // Die Logout-Funktion wird in app.js definiert und global verfügbar gemacht.
            window.app.logout();
        }
        return null;
    }
};

export const State_Service = {
    /**
     * Initialisiert den State. Versucht zuerst, ihn aus dem Session-Cache zu laden.
     * Wenn kein Cache vorhanden ist, werden die Daten vom Server geholt.
     * @returns {Promise<object>} Den initialisierten Anwendungsstatus.
     */
    async init_state_service() {
        const cached_data = sessionStorage.getItem(CACHE_KEY);
        if (cached_data) {
            state = JSON.parse(cached_data);
            console.log("State initialized from cache.");
            return state;
        }
        return await _fetch_and_init_local_state();
    },

    /**
     * Löscht den lokalen State und Cache. Wird beim Logout aufgerufen.
     */
    clear_local_state() {
        state = null;
        sessionStorage.removeItem(CACHE_KEY);
        console.log("State and cache cleared.");
    },

    /**
     * Gibt eine Kopie des gesamten aktuellen States zurück.
     * @returns {object|null} Der aktuelle State.
     */
    get_local_state: () => state ? JSON.parse(JSON.stringify(state)) : null,

    /**
     * Gibt eine bestimmte Entitätenliste aus dem State zurück.
     * @param {string} entity_name - Der Name der Entität (z.B. 'foods', 'activity_logs').
     * @returns {Array} Die Liste der Entitäten.
     */
    get_local_entity: (entity_name) => state ? state[entity_name] || [] : [],
    
    /**
     * Gibt das Benutzerprofil aus dem State zurück.
     * @returns {object} Das Benutzerprofil.
     */
    get_local_profile: () => state ? state.user_profile || {} : {},

    /**
     * Fügt ein neues Element zu einer Entitätenliste im State hinzu und speichert es im Cache.
     * @param {string} entity_name - Der Name der Entität.
     * @param {object} item - Das hinzuzufügende Element.
     */
    add_local_item: (entity_name, item) => {
        if (state && Array.isArray(state[entity_name])) {
            state[entity_name].push(item);
            _commit();
        }
    },

    /**
     * Aktualisiert ein vorhandenes Element in einer Entitätenliste und speichert es im Cache.
     * @param {string} entity_name - Der Name der Entität.
     * @param {object} updated_item - Das aktualisierte Element (muss eine 'id' haben).
     */
    update_local_item: (entity_name, updated_item) => {
        if (state && Array.isArray(state[entity_name])) {
            const index = state[entity_name].findIndex(i => i.id === updated_item.id);
            if (index !== -1) {
                state[entity_name][index] = updated_item;
                _commit();
            }
        }
    },
    
    /**
     * Aktualisiert das Benutzerprofil im State.
     * @param {object} updated_profile - Das aktualisierte Profilobjekt.
     */
    update_local_profile: (updated_profile) => {
        if (state) {
            state.user_profile = updated_profile;
            _commit();
        }
    },

    /**
     * Entfernt ein Element anhand seiner ID aus einer Entitätenliste und speichert es im Cache.
     * @param {string} entity_name - Der Name der Entität.
     * @param {number|string} item_id - Die ID des zu entfernenden Elements.
     */
    delete_local_item: (entity_name, item_id) => {
        if (state && Array.isArray(state[entity_name])) {
            // Wichtig: IDs können Zahlen oder Strings sein, daher '==' verwenden.
            state[entity_name] = state[entity_name].filter(i => i.id != item_id);
            _commit();
        }
    },
};
