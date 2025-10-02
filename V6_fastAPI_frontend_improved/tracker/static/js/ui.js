let chart_instance = null; // Private Variable für die Chart-Instanz

/**
 * Führt DOM-Caching durch und gibt ein Objekt mit Referenzen auf alle wichtigen UI-Elemente zurück.
 * @returns {object} Ein Objekt, das die DOM-Elemente enthält.
 */
export function bind_DOM() {
    return {
        views: { auth: null, app: null }, 
        auth: {
            nav_section: document.getElementById("auth-nav-section"),
        },
        dashboard: {},
        profile: {},
        modal: {
            instance: null, 
            confirm: null,
        },
        toast_container: document.getElementById('toast-container'),
        fun_mode: {
            toggle: document.getElementById('fun-mode-toggle'),
            fun_mode_gif_left: document.getElementById('fun-gif-left'),
            fun_mode_gif_right: document.getElementById('fun-gif-right'),
        },
    };
}

/**
 * Binds the DOM elements for a dynamically loaded view.
 * @param {object} dom_object - The global dom cache object to update.
 * @param {'auth' | 'app'} view_name - The name of the view that was just loaded.
 */
export function rebind_dynamic_elements(dom_object, view_name) {
    if (view_name === 'auth') {
        dom_object.views.auth = document.getElementById("auth-view");
        dom_object.auth.form = document.getElementById("auth-form");
        dom_object.auth.title = document.getElementById("auth-title");
        dom_object.auth.submit_button = document.getElementById("auth-submit-btn");
        dom_object.auth.toggle_link = document.getElementById("toggle-auth-mode");
        dom_object.auth.error_div = document.getElementById("auth-error");
    } else if (view_name === 'app') {
        dom_object.views.app = document.getElementById("app-view");
        // Dashboard
        dom_object.dashboard.period_selector = document.getElementById("period-selector");
        dom_object.dashboard.total_kcal_in = document.getElementById("total-in");
        dom_object.dashboard.total_kcal_out = document.getElementById("total-out");
        dom_object.dashboard.total_kcal_balance = document.getElementById("total-balance");
        dom_object.dashboard.balance_title = document.getElementById("balance-title");
        dom_object.dashboard.balance_goal_number = document.getElementById("balance-goal-number");
        dom_object.dashboard.balance_goal_title = document.getElementById("balance-goal-title");
        dom_object.dashboard.chart_canvas = document.getElementById("energy-chart");
        dom_object.dashboard.goal_card = document.getElementById("goal-card");
        // Profile
        dom_object.profile.form = document.getElementById("profile-form");
        dom_object.profile.gender = document.getElementById("profile-gender");
        dom_object.profile.age = document.getElementById("profile-age");
        dom_object.profile.height = document.getElementById("profile-height");
        dom_object.profile.weight = document.getElementById("profile-weight");
        dom_object.profile.start_date = document.getElementById("profile-start-date");
        dom_object.profile.balance_goal = document.getElementById("profile-balance-goal");
        // Modals (elements inside the modals, which are now guaranteed to be in the DOM)
        dom_object.modal.element = document.getElementById("item-modal");
        dom_object.modal.form = document.getElementById("modal-form");
        dom_object.modal.title = document.getElementById("modal-title");
        dom_object.modal.save_button = document.getElementById("modal-save-btn");
        dom_object.modal.confirm_message = document.getElementById("confirm-message");
        dom_object.modal.confirm_button = document.getElementById("confirm-btn");
    }
}


/**
 * Zeigt eine Toast-Benachrichtigung an.
 * @param {HTMLElement} toast_container Das DOM-Element des Toast-Containers.
 * @param {string} message Die anzuzeigende Nachricht.
 * @param {string} type Der Typ des Toasts ('success' oder 'danger').
 */
export function show_toast(toast_container, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    toast_container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

export function handle_fun_mode_toggle(e, dom) {
    const is_enabled = e.target.checked;
    if (is_enabled) {
        dom.fun_mode.fun_mode_gif_left.classList.add('show');
        dom.fun_mode.fun_mode_gif_right.classList.add('show');
    } else {
        dom.fun_mode.fun_mode_gif_left.classList.remove('show');
        dom.fun_mode.fun_mode_gif_right.classList.remove('show');
    }
}

/**
 * Zeigt eine Fehlermeldung innerhalb des Modals an.
 * @param {HTMLElement} modal_element Das DOM-Element des Modals.
 * @param {string} message Die Fehlermeldung.
 */
export function show_modal_error(modal_element, message) {
    const errorDisplay = modal_element.querySelector('.modal-error-display');
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
    }
}

/**
 * Löscht die Fehlermeldung im Modal.
 * @param {HTMLElement} modal_element Das DOM-Element des Modals.
 */
export function clear_modal_error(modal_element) {
    const errorDisplay = modal_element.querySelector('.modal-error-display');
    if (errorDisplay) {
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';
    }
}

/**
 * Rendert das Energiebilanz-Diagramm mit detaillierten, prozentualen Tooltips.
 * @param {HTMLCanvasElement} chart_canvas Das Canvas-Element für das Diagramm.
 * @param {object} data Die Daten für das Diagramm, inklusive 'details_in' und 'details_out'.
 */
export function render_chart(chart_canvas, data) {
    const sanitizeArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(value => (typeof value === 'number' && isFinite(value) ? value : 0));
    };

    const calories_in_clean = sanitizeArray(data.calories_in);
    const calories_out_BMR_clean = sanitizeArray(data.calories_out_bmr);
    const calories_out_active_clean = sanitizeArray(data.calories_out_active);

    const ctx = chart_canvas.getContext("2d");
    if (chart_instance) chart_instance.destroy();

    chart_instance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: "Aufgenommen",
                    data: calories_in_clean,
                    backgroundColor: "rgba(32, 131, 55, 0.7)",
                },
                {
                    label: "Grundverbrauch",
                    data: calories_out_BMR_clean,
                    backgroundColor: "rgba(148, 36, 36, 0.65)",
                    stack: 'Verbrauch',
                },
                {
                    label: "Aktiv verbraucht",
                    data: calories_out_active_clean,
                    backgroundColor: "rgba(164, 52, 42, 0.69)",
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
                        size: 20
                    },
                    bodyFont: {
                        size: 20 
                    },
                    footerFont: {
                        size: 20 
                    },
                    callbacks: {
                        label: function(tooltipItems) {
                            const dataset_index = tooltipItems.datasetIndex;
                            const data_index = tooltipItems.dataIndex;
                            const value = tooltipItems.raw;
                            let label = tooltipItems.dataset.label || '';

                            if (label) {
                                label += ': ';
                            }
                            label += `${value} kcal`;

                            if (dataset_index === 1 || dataset_index === 2) {
                                const total_kcal_out = calories_out_BMR_clean[data_index] + calories_out_active_clean[data_index];
                                if (total_kcal_out > 0) {
                                    const percentage = (value / total_kcal_out * 100).toFixed(1);
                                    label += ` (${percentage}%)`;
                                }
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            const tooltip_item = tooltipItems[0];
                            const dataset_index = tooltip_item.datasetIndex;
                            const data_index = tooltip_item.dataIndex;

                            if (dataset_index === 0 && data.details_in[data_index]?.length > 0) {
                                const total_kcal_in = calories_in_clean[data_index];
                                if (total_kcal_in > 0) {
                                    // Transformiere jeden Detail-Eintrag
                                    return data.details_in[data_index].map(detail => {
                                        // Extrahiere die Kalorienzahl aus dem String (z.B. "Apfel: 95 kcal")
                                        const match = detail.match(/: (\d+(\.\d+)?)/);
                                        if (match && match[1]) {
                                            const value = parseFloat(match[1]);
                                            const percentage = (value / total_kcal_in * 100).toFixed(1);
                                            return `${detail} (${percentage}%)`;
                                        }
                                        return detail; // Fallback, falls keine Zahl gefunden wird
                                    });
                                }
                                return data.details_in[data_index];
                            }
                            // =================================================================

                            if (dataset_index === 2 && data.details_out[data_index]?.length > 0) {
                                const total_active_out = calories_out_active_clean[data_index];
                                if (total_active_out > 0) {
                                    // Transformiere jeden Detail-Eintrag, um den Prozentanteil hinzuzufügen
                                    return data.details_out[data_index].map(detail => {
                                        // Extrahiere die Kalorienzahl aus dem String (z.B. "Joggen: 350 kcal")
                                        const match = detail.match(/: (\d+(\.\d+)?)/);
                                        if (match && match[1]) {
                                            const value = parseFloat(match[1]);
                                            const percentage = (value / total_active_out * 100).toFixed(1);
                                            return `${detail} (${percentage}%)`;
                                        }
                                        return detail; // Fallback, falls keine Zahl gefunden wird
                                    });
                                }
                                return data.details_out[data_index];
                            }

                            return [];
                        }
                    }
                }
            }
        }
    });
}

let goal_already_reached = false;

/**
 * Löst einen Konfetti-Effekt aus.
 */
export function trigger_confetti() {
    confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
    });
}

/**
 * Aktualisiert die Dashboard-Karten mit den neuen Daten.
 * @param {object} dom_dashboard_elements Ein Objekt mit den Referenzen auf die Dashboard-Elemente.
 * @param {object} data Die neuen Dashboard-Daten.
 */
export function update_dashboard_cards(dom_dashboard_elements, data) {
    dom_dashboard_elements.total_kcal_in.textContent = `${data.total_in} kcal`;
    dom_dashboard_elements.total_kcal_out.textContent = `${data.total_out} kcal`;
    const balance = data.balance;
    dom_dashboard_elements.total_kcal_balance.textContent = `${balance >= 0 ? '+' : ''}${balance} kcal`;

    dom_dashboard_elements.balance_title.className = balance >= 0 ? 'text-success' : 'text-danger';
    dom_dashboard_elements.total_kcal_balance.className = `fs-2 mb-0 ${balance >= 0 ? 'text-success' : 'text-danger'}`;

    if (data.balance_goal !== null && data.balance_goal !== undefined) {
        const goal = data.balance_goal;
        let is_goal_reached = false;

        if (goal <= 0) { is_goal_reached = balance <= goal; } 
        else { is_goal_reached = balance >= goal; }

        if (is_goal_reached) {
            const surplus = Math.abs(balance - goal);
            dom_dashboard_elements.balance_goal_title.textContent = '🎉 Super!';
            dom_dashboard_elements.balance_goal_number.textContent = `${surplus} kcal über Ziel`;
            // NEU: Fügt eine Klasse hinzu, um die Karte für den Klick vorzubereiten
            dom_dashboard_elements.goal_card.classList.add('goal-reached-clickable');
        } else {
            
            const remaining_goal = goal - balance;
            dom_dashboard_elements.balance_goal_title.textContent = `${remaining_goal >= 0 ? 'Esse noch' : 'Verbrenn noch'}`;
            dom_dashboard_elements.balance_goal_number.textContent = `${remaining_goal >= 0 ? `${remaining_goal} kcal! 😋` : `${remaining_goal} kcal! 🔥`}`;
            // NEU: Entfernt die Klasse, falls das Ziel nicht mehr erreicht ist
            dom_dashboard_elements.goal_card.classList.remove('goal-reached-clickable');
        }

        const titleClasses = dom_dashboard_elements.balance_goal_title.classList;
        const numberClasses = dom_dashboard_elements.balance_goal_number.classList;
        titleClasses.remove('text-success', 'text-danger', 'text-warning');
        numberClasses.remove('text-success', 'text-danger', 'text-warning');
        titleClasses.add(is_goal_reached ? 'text-success' : 'text-danger');
        numberClasses.add(is_goal_reached ? 'text-success' : 'text-danger');

    } else {
        dom_dashboard_elements.balance_goal_number.textContent = '---';
        dom_dashboard_elements.balance_goal_title.textContent = 'Verbleibend z. Ziel';
        dom_dashboard_elements.balance_goal_title.classList.remove('text-success', 'text-danger');
        dom_dashboard_elements.balance_goal_title.classList.add('text-warning');
        // NEU: Stellt sicher, dass die Klasse auch hier entfernt wird
        dom_dashboard_elements.goal_card.classList.remove('goal-reached-clickable');
        
    }
}




