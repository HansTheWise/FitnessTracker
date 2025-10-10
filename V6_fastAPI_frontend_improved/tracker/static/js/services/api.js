const API_BASE_URL = window.location.origin;

/**
 * Custom error class to specifically handle authentication errors.
 */
export class Auth_Error extends Error {
    constructor(message) {
        super(message);
        this.name = "Auth Error";
    }
}

/**
 * A wrapper for the Fetch API that automates authentication, JSON handling, and error management.
 * @param {string} endpoint - The API endpoint (e.g., '/api/foods').
 * @param {object} options - Standard fetch options (method, body, etc.).
 * @returns {Promise<any>} A promise that resolves with the JSON data from the API response.
 */
export async function api_fetch(endpoint, options = {}) {
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
        // This will be caught by our application logic to trigger a logout.
        throw new Auth_Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
    // Try to parse the JSON error response from the backend
        const error_data = await response.json().catch(() => {
            // Fallback if the response is not valid JSON
            return { detail: "An unknown API error occurred." };
        });
    // Throw an error with the specific message from FastAPI (which uses the 'detail' key)
        throw new Error(error_data.detail || "An API error has occurred.");
    }
    
    // Handle successful responses with no content (e.g., DELETE 204)
    if (response.status === 204) {
        return null;
    }

    return response.json();
}
