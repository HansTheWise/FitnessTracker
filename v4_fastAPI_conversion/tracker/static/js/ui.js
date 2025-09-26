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
 * Rendert das Energiebilanz-Diagramm mit detaillierten, prozentualen Tooltips.
 * @param {HTMLCanvasElement} chartCanvas Das Canvas-Element für das Diagramm.
 * @param {object} data Die Daten für das Diagramm, inklusive 'details_in' und 'details_out'.
 */
export function renderChart(chartCanvas, data) {
    const sanitizeArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(value => (typeof value === 'number' && isFinite(value) ? value : 0));
    };

    const caloriesInClean = sanitizeArray(data.calories_in);
    const caloriesOutBmrClean = sanitizeArray(data.calories_out_bmr);
    const caloriesOutActiveClean = sanitizeArray(data.calories_out_active);

    const ctx = chartCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: "Aufgenommen",
                    data: caloriesInClean,
                    backgroundColor: "rgba(40, 167, 69, 0.7)",
                },
                {
                    label: "Grundverbrauch",
                    data: caloriesOutBmrClean,
                    backgroundColor: "rgba(220, 53, 69, 0.4)",
                    stack: 'Verbrauch',
                },
                {
                    label: "Aktiv verbraucht",
                    data: caloriesOutActiveClean,
                    backgroundColor: "rgba(220, 53, 69, 0.8)",
                    stack: 'Verbrauch',
                }
            ],
        },
        options: {
            scales: {
                y: { stacked: true, beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.1)" } },
                x: { grid: { color: "rgba(255, 255, 255, 0.1)" } }
            },
            
            plugins: {
                tooltip: {
                     titleFont: {
                        size: 24 // z.B. 16 Pixel für den Titel
                    },
                    bodyFont: {
                        size: 24 // z.B. 14 Pixel für den Hauptteil
                    },
                    footerFont: {
                        size: 24 // z.B. 12 Pixel für die Fußzeile
                    },
                    callbacks: {
                        label: function(tooltipItem) {
                            const datasetIndex = tooltipItem.datasetIndex;
                            const dataIndex = tooltipItem.dataIndex;
                            const value = tooltipItem.raw;
                            let label = tooltipItem.dataset.label || '';

                            if (label) {
                                label += ': ';
                            }
                            label += `${value} kcal`;

                            if (datasetIndex === 1 || datasetIndex === 2) {
                                const totalOut = caloriesOutBmrClean[dataIndex] + caloriesOutActiveClean[dataIndex];
                                if (totalOut > 0) {
                                    const percentage = (value / totalOut * 100).toFixed(1);
                                    label += ` (${percentage}%)`;
                                }
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            const tooltipItem = tooltipItems[0];
                            const datasetIndex = tooltipItem.datasetIndex;
                            const dataIndex = tooltipItem.dataIndex;

                            // =================================================================
                            // NEU: Logik für prozentuale Anzeige der Aufnahme-Details
                            // =================================================================
                            if (datasetIndex === 0 && data.details_in[dataIndex]?.length > 0) {
                                const totalIn = caloriesInClean[dataIndex];
                                if (totalIn > 0) {
                                    // Transformiere jeden Detail-Eintrag
                                    return data.details_in[dataIndex].map(detail => {
                                        // Extrahiere die Kalorienzahl aus dem String (z.B. "Apfel: 95 kcal")
                                        const match = detail.match(/: (\d+(\.\d+)?)/);
                                        if (match && match[1]) {
                                            const value = parseFloat(match[1]);
                                            const percentage = (value / totalIn * 100).toFixed(1);
                                            return `${detail} (${percentage}%)`;
                                        }
                                        return detail; // Fallback, falls keine Zahl gefunden wird
                                    });
                                }
                                return data.details_in[dataIndex];
                            }
                            // =================================================================

                            if (datasetIndex === 2 && data.details_out[dataIndex]?.length > 0) {
                                return data.details_out[dataIndex];
                            }

                            return [];
                        }
                    }
                }
            }
        }
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