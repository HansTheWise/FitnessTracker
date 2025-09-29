let chartInstance = null; // Private Variable für die Chart-Instanz

/**
 * Führt DOM-Caching durch und gibt ein Objekt mit Referenzen auf alle wichtigen UI-Elemente zurück.
 * @returns {object} Ein Objekt, das die DOM-Elemente enthält.
 */
export function bindDOM() {
    return {
        views: { auth: document.getElementById("auth-view"), app: document.getElementById("app-view") },
        auth: {
            form: document.getElementById("auth-form"),
            title: document.getElementById("auth-title"),
            submitBtn: document.getElementById("auth-submit-btn"),
            toggleLink: document.getElementById("toggle-auth-mode"),
            errorDiv: document.getElementById("auth-error"),
            navSection: document.getElementById("auth-nav-section"),
        },
        dashboard: {
            periodSelector: document.getElementById("period-selector"),
            totalIn: document.getElementById("total-in"),
            totalOut: document.getElementById("total-out"),
            totalBalance: document.getElementById("total-balance"),
            balanceTitle: document.getElementById("balance-title"),
            chartCanvas: document.getElementById("energy-chart"),
        },
        profile: {
            form: document.getElementById("profile-form"),
            gender: document.getElementById("profile-gender"),
            age: document.getElementById("profile-age"),
            height: document.getElementById("profile-height"),
            weight: document.getElementById("profile-weight"),
            startDate: document.getElementById("profile-start-date"),
        },
        modal: {
            instance: new bootstrap.Modal(document.getElementById("item-modal")),
            element: document.getElementById("item-modal"),
            form: document.getElementById("modal-form"),
            title: document.getElementById("modal-title"),
            saveBtn: document.getElementById("modal-save-btn"),
        },
        toastContainer: document.getElementById('toast-container'),
    };
}

/**
 * Zeigt eine Toast-Benachrichtigung an.
 * @param {HTMLElement} toastContainer Das DOM-Element des Toast-Containers.
 * @param {string} message Die anzuzeigende Nachricht.
 * @param {string} type Der Typ des Toasts ('success' oder 'danger').
 */
export function showToast(toastContainer, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * Zeigt eine Fehlermeldung innerhalb des Modals an.
 * @param {HTMLElement} modalElement Das DOM-Element des Modals.
 * @param {string} message Die Fehlermeldung.
 */
export function showModalError(modalElement, message) {
    const errorDisplay = modalElement.querySelector('.modal-error-display');
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
    }
}

/**
 * Löscht die Fehlermeldung im Modal.
 * @param {HTMLElement} modalElement Das DOM-Element des Modals.
 */
export function clearModalError(modalElement) {
    const errorDisplay = modalElement.querySelector('.modal-error-display');
    if (errorDisplay) {
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';
    }
}

/**
 * Rendert das Energiebilanz-Diagramm.
 * @param {HTMLCanvasElement} chartCanvas Das Canvas-Element für das Diagramm.
 * @param {object} data Die Daten für das Diagramm.
 */
export function renderChart(chartCanvas, data) {
    const ctx = chartCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [
                { label: "Aufgenommen (kcal)", data: data.calories_in, backgroundColor: "rgba(40, 167, 69, 0.6)", borderColor: "#28a745", borderWidth: 1, details: data.details_in, },
                { label: "Verbraucht (kcal)", data: data.calories_out, backgroundColor: "rgba(220, 53, 69, 0.6)", borderColor: "#dc3545", borderWidth: 1, details: data.details_out, }
            ],
        },
        options: { scales: { y: { beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.1)" } }, x: { grid: { color: "rgba(255, 255, 255, 0.1)" } } }, plugins: { tooltip: { callbacks: { footer: (tooltipItems) => { let footerText = []; tooltipItems.forEach(item => { const details = item.dataset.details[item.dataIndex]; if (details && details.length > 0) { footerText.push(...details); } }); return footerText; } } } } }
    });
}

/**
 * Aktualisiert die Dashboard-Karten mit den neuen Daten.
 * @param {object} domDashboardElements Ein Objekt mit den Referenzen auf die Dashboard-Elemente.
 * @param {object} data Die neuen Dashboard-Daten.
 */
export function updateDashboardCards(domDashboardElements, data) {
    domDashboardElements.totalIn.textContent = `${data.total_in} kcal`;
    domDashboardElements.totalOut.textContent = `${data.total_out} kcal`;
    const balance = data.balance;
    domDashboardElements.totalBalance.textContent = `${balance >= 0 ? '+' : ''}${balance} kcal`;
    domDashboardElements.balanceTitle.className = balance >= 0 ? 'text-success' : 'text-danger';
    domDashboardElements.totalBalance.className = `fs-2 mb-0 ${balance >= 0 ? 'text-success' : 'text-danger'}`;
}