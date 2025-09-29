const API_BASE_URL = window.location.origin;

/**
 * Eine benutzerdefinierte Fehlerklasse, um Authentifizierungsfehler gezielt abfangen zu können.
 */
export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuthError";
    }
}

/**
 * Ein Wrapper für die Fetch-API, der Authentifizierung, JSON-Handling und Fehlerbehandlung "automatisiert".
 * @param {string} endpoint Der API-Endpunkt (z.B. '/api/foods').
 * @param {object} options Standard-Fetch-Optionen (method, body, etc.).
 * @returns {Promise<any>} Ein Promise, das mit den JSON-Daten der API-Antwort aufgelöst wird.
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("jwt_token");
    const headers = { "Content-Type": "application/json", ...options.headers };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.body) {
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401) {
        throw new AuthError("Sitzung abgelaufen. Bitte erneut anmelden.");
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: "Ein unbekannter API-Fehler ist aufgetreten." }));
        throw new Error(errorData.msg || "Ein API-Fehler ist aufgetreten.");
    }

    return response.status === 204 ? null : response.json();
}