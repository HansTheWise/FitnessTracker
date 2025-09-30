import { Auth_Component } from './components/Auth.js';
import { Entity_Management_Component } from './components/Entity_Management.js';
import { Profile_Component } from './components/Profile.js';
import { Dashboard_Service } from './services/Dashboard_Service.js';
import { State_Service } from './services/State_Service.js';
// KORREKTUR: Alle benötigten UI-Funktionen werden importiert
import './DataTable.js';
import { bind_DOM, handle_fun_mode_toggle, rebind_dynamic_elements, render_chart, trigger_confetti, update_dashboard_cards } from './ui.js';

// Globaler Namespace für die App
window.app = {};

// KORREKTUR: dom wird hier einmal korrekt mit der Grundstruktur initialisiert.
const dom = bind_DOM();

/**
 * Loads an HTML component into a target element.
 * @param {string} component_name - The name of the HTML file (e.g., 'auth').
 * @param {string} target_selector - The CSS selector of the target container.
 */
async function load_component(component_name, target_selector) {
    try {
        // Annahme: HTML-Dateien liegen im Root-Verzeichnis, nicht in /templates/
        const response = await fetch(`templates/${component_name}.html`);
        if (!response.ok) throw new Error(`Component ${component_name} could not be loaded.`);
        document.querySelector(target_selector).innerHTML = await response.text();
    } catch (error) {
        console.error(`Error loading component: ${error}`);
    }
}

/**
 * Loads the main view (auth or app) and re-binds DOM elements.
 * @param {'auth' | 'app'} view_name - The name of the view to display.
 */
async function show_view(view_name) {
    const component = view_name === 'app' ? 'main' : 'auth';
    await load_component(component, '#main-container');
    // KORREKTUR: rebindDynamicElements befüllt das bestehende dom-Objekt, anstatt es zu überschreiben.
    rebind_dynamic_elements(dom, view_name);
}

/**
 * Updates the dashboard UI based on the current state and selected period.
 * @param {string} period - The time period ('day', 'week', 'month', 'year').
 */
function update_dashboard(period) {
    if (!dom.dashboard) return;
    const allData = State_Service.get_local_state();
    if (!allData) return;
    const dashboard_data = Dashboard_Service.get_dashboard_data(period, allData);

    // KORREKTUR: Ruft die ausgelagerten UI-Funktionen auf.
    update_dashboard_cards(dom.dashboard, dashboard_data);
    render_chart(dom.dashboard.chart_canvas, dashboard_data);
}

/**
 * Logs the user out, clears state and storage, and shows the auth view.
 */
async function logout() {
    localStorage.removeItem("jwt_token");
    State_Service.clear_local_state();
    await show_view('auth');
    dom.auth.nav_section.innerHTML = ''
    Auth_Component.init(dom, initialize_app);
}
window.app.logout = logout; // Expose to global scope for services

/**
 * Initializes the main application view after successful login.
 */
async function initialize_app() {
    await show_view('app');

    try {
        await State_Service.init_state_service();
        
        // Setup Logout Button
        if (dom.auth.nav_section) {
            dom.auth.nav_section.innerHTML = '<button id="logout-btn" class="btn btn-outline-danger">Abmelden</button>';
            document.getElementById('logout-btn').addEventListener('click', logout);
        }

        // Initialize components
        Profile_Component.init(dom, update_dashboard);
        Entity_Management_Component.init(dom, update_dashboard);

        // Initial dashboard render
        update_dashboard("week");
        
        // Bind dashboard period selector
        if (dom.dashboard.period_selector) {
            dom.dashboard.period_selector.addEventListener("click", (e) => {
                if (e.target.tagName === "BUTTON") {
                    dom.dashboard.period_selector.querySelector(".active").classList.remove("active");
                    e.target.classList.add("active");
                    update_dashboard(e.target.dataset.period);
                }
            });
        }
        if (dom.dashboard.goal_card) {
            dom.dashboard.goal_card.addEventListener('click', () => {
                // Prüft, ob die Karte die spezielle Klasse hat, die in ui.js gesetzt wird
                if (dom.dashboard.goal_card.classList.contains('goal-reached-clickable')) {
                    trigger_confetti();
                }
            });
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        logout();
    }
}

/**
 * Checks for an existing JWT and initializes the appropriate view.
 */
async function check_initial_auth() {
    if (localStorage.getItem("jwt_token")) {
        await initialize_app();
    } else {
        await show_view('auth');
        Auth_Component.init(dom, initialize_app); // dom wird übergeben
    }
}

/**
 * Main startup function.
 */
async function startup() {
    await load_component('modals', '#modals-container');
    
    // Initialisiere Modal-Instanzen nach dem Laden
    dom.modal.instance = new bootstrap.Modal(document.getElementById("item-modal"));
    dom.modal.confirm = new bootstrap.Modal(document.getElementById("confirm-modal"));

    await check_initial_auth();
    if (dom.fun_mode.toggle) {
        dom.fun_mode.toggle.addEventListener('change', handle_fun_mode_toggle);
        };
}

// Start the application
startup();

