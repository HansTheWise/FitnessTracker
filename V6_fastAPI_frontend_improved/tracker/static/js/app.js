import { AuthComponent } from './components/Auth.js';
import { EntityManagementComponent } from './components/EntityManagement.js';
import { ProfileComponent } from './components/Profile.js';
import { DashboardService } from './services/DashboardService.js';
import { StateService } from './services/StateService.js';
// KORREKTUR: Alle benötigten UI-Funktionen werden importiert
import './DataTable.js';
import { bindDOM, handleFunModeToggle, rebindDynamicElements, renderChart, triggerConfetti, updateDashboardCards } from './ui.js';

// Globaler Namespace für die App
window.app = {};

// KORREKTUR: dom wird hier einmal korrekt mit der Grundstruktur initialisiert.
const dom = bindDOM();

/**
 * Loads an HTML component into a target element.
 * @param {string} componentName - The name of the HTML file (e.g., 'auth').
 * @param {string} targetSelector - The CSS selector of the target container.
 */
async function loadComponent(componentName, targetSelector) {
    try {
        // Annahme: HTML-Dateien liegen im Root-Verzeichnis, nicht in /templates/
        const response = await fetch(`templates/${componentName}.html`);
        if (!response.ok) throw new Error(`Component ${componentName} could not be loaded.`);
        document.querySelector(targetSelector).innerHTML = await response.text();
    } catch (error) {
        console.error(`Error loading component: ${error}`);
    }
}

/**
 * Loads the main view (auth or app) and re-binds DOM elements.
 * @param {'auth' | 'app'} viewName - The name of the view to display.
 */
async function showView(viewName) {
    const component = viewName === 'app' ? 'main' : 'auth';
    await loadComponent(component, '#main-container');
    // KORREKTUR: rebindDynamicElements befüllt das bestehende dom-Objekt, anstatt es zu überschreiben.
    rebindDynamicElements(dom, viewName);
}

/**
 * Updates the dashboard UI based on the current state and selected period.
 * @param {string} period - The time period ('day', 'week', 'month', 'year').
 */
function updateDashboard(period) {
    if (!dom.dashboard) return;
    const allData = StateService.getState();
    if (!allData) return;
    const dashboardData = DashboardService.getDashboardData(period, allData);

    // KORREKTUR: Ruft die ausgelagerten UI-Funktionen auf.
    updateDashboardCards(dom.dashboard, dashboardData);
    renderChart(dom.dashboard.chartCanvas, dashboardData);
}

/**
 * Logs the user out, clears state and storage, and shows the auth view.
 */
async function logout() {
    localStorage.removeItem("jwt_token");
    StateService.clear();
    await showView('auth');
    dom.auth.navSection.innerHTML = ''
    AuthComponent.init(dom, initializeApp);
}
window.app.logout = logout; // Expose to global scope for services

/**
 * Initializes the main application view after successful login.
 */
async function initializeApp() {
    await showView('app');

    try {
        await StateService.init();
        
        // Setup Logout Button
        if (dom.auth.navSection) {
            dom.auth.navSection.innerHTML = '<button id="logout-btn" class="btn btn-outline-danger">Abmelden</button>';
            document.getElementById('logout-btn').addEventListener('click', logout);
        }

        // Initialize components
        ProfileComponent.init(dom, updateDashboard);
        EntityManagementComponent.init(dom, updateDashboard);

        // Initial dashboard render
        updateDashboard("week");
        
        // Bind dashboard period selector
        if (dom.dashboard.periodSelector) {
            dom.dashboard.periodSelector.addEventListener("click", (e) => {
                if (e.target.tagName === "BUTTON") {
                    dom.dashboard.periodSelector.querySelector(".active").classList.remove("active");
                    e.target.classList.add("active");
                    updateDashboard(e.target.dataset.period);
                }
            });
        }
        if (dom.dashboard.goalCard) {
            dom.dashboard.goalCard.addEventListener('click', () => {
                // Prüft, ob die Karte die spezielle Klasse hat, die in ui.js gesetzt wird
                if (dom.dashboard.goalCard.classList.contains('goal-reached-clickable')) {
                    triggerConfetti();
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
async function checkInitialAuth() {
    if (localStorage.getItem("jwt_token")) {
        await initializeApp();
    } else {
        await showView('auth');
        AuthComponent.init(dom, initializeApp); // dom wird übergeben
    }
}

/**
 * Main startup function.
 */
async function startup() {
    await loadComponent('modals', '#modals-container');
    
    // Initialisiere Modal-Instanzen nach dem Laden
    dom.modal.instance = new bootstrap.Modal(document.getElementById("item-modal"));
    dom.modal.confirm = new bootstrap.Modal(document.getElementById("confirm-modal"));

    await checkInitialAuth();
    if (dom.funMode.toggle) {
        dom.funMode.toggle.addEventListener('change', handleFunModeToggle);
        };
}

// Start the application
startup();

