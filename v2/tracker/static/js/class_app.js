// Die DataTable-Komponente wird automatisch durch das Laden in der HTML-Datei registriert.

class FitnessApp {
    constructor() {
        this.API_BASE_URL = window.location.origin;
        this.itemModal = new bootstrap.Modal(document.getElementById("item-modal"));
        this.chart = null;
        this.state = {
            isLoginMode: true,
            foods: [],
            exercisetypes: [],
            consumptionlogs: [],
            activitylogs: [],
            profile: {},
        };
        this.bindDOM();
        this.addEventListeners();
        this.checkInitialAuth();
    }

    // --- 1. Binding & Event Listeners ---
    // wir betreiben hir DOM Caching
    // wir erstellen javascript objekte um die verschiedenen html komponenten zu gruppieren und in key : value paaren die referenz auf diese zu speichern
    // dies sorgt für einen saubereren code und einfacher zu verstehende aufrufe
    bindDOM() {
        this.views = {
            auth: document.getElementById("auth-view"),
            app: document.getElementById("app-view")
        };
        this.auth = {
            form: document.getElementById("auth-form"),
            title: document.getElementById("auth-title"),
            submitBtn: document.getElementById("auth-submit-btn"),
            toggleLink: document.getElementById("toggle-auth-mode"),
            errorDiv: document.getElementById("auth-error"),
            navSection: document.getElementById("auth-nav-section"),
        };
        this.dashboard = {
            periodSelector: document.getElementById("period-selector"),
            totalIn: document.getElementById("total-in"),
            totalOut: document.getElementById("total-out"),
            totalBalance: document.getElementById("total-balance"),
            balanceTitle: document.getElementById("balance-title"),
            chartCanvas: document.getElementById("energy-chart"),
        };
        this.profile = {
            form: document.getElementById("profile-form"),
            gender: document.getElementById("profile-gender"),
            age: document.getElementById("profile-age"),
            height: document.getElementById("profile-height"),
            weight: document.getElementById("profile-weight"),
            startDate: document.getElementById("profile-start-date"),
        };
        this.toastContainer = document.getElementById('toast-container');
    }

    addEventListeners() {
        this.auth.toggleLink.addEventListener("click", () => {this.toggleAuthMode();});
        this.auth.form.addEventListener("submit", (e) => this.handleAuthSubmit(e));
        this.dashboard.periodSelector.addEventListener("click", (e) => this.handlePeriodChange(e));
        this.profile.form.addEventListener("submit", (e) => this.handleProfileSubmit(e));

// In app.js -> addEventListeners()
        document.querySelectorAll('[data-action="open-modal"]').forEach(button => {
            button.addEventListener('click', () => {
                const entity = button.dataset.entity;
                this.openModal(entity);
            });
        });

        // für jedes custom data-table element tun wir für jede tabble uns dessen entity type holen aus seiner attribut variable
        // dann fügen wir eventlistener für unsere customevents edit und delete für jede tabelle ein
        // diese öffnen dann das passende fenster für das entity mit den details welche mit e.details = event details gesendet wurden finden wir dann die id des datensatzes
        // da wir den verweis auf den datensatz mitsenden (die id) müssen wir nur einen listener auf jeder tabelle für jeweils eine der beiden cases haben und der rest wird dann mit dem details event body mitgesendent
        document.querySelectorAll("data-table").forEach((table) => {
            const entity = table.getAttribute("entity");
            table.addEventListener("edit", (e) => this.openModal(entity, e.detail.id));
            table.addEventListener("delete", (e) => this.deleteItem(entity, e.detail.id));
        });
    }

    // --- 2. Authentication ---
    checkInitialAuth() { if (localStorage.getItem("jwt_token")) this.initializeApp(); }

    toggleAuthMode() {
        this.state.isLoginMode = !this.state.isLoginMode;
        this.auth.title.textContent = this.state.isLoginMode ? "Anmelden" : "Registrieren";
        this.auth.submitBtn.textContent = this.state.isLoginMode ? "Anmelden" : "Registrieren";
        this.auth.toggleLink.textContent = this.state.isLoginMode ? "Noch kein Konto? Jetzt registrieren." : "Bereits ein Konto? Jetzt anmelden.";
        this.auth.errorDiv.textContent = "";
        this.auth.form.reset();
    }

    async handleAuthSubmit(e) {
        // preventDefault wir hier genutzt da wir ein <form> element haben, welches beim absenden (submit) daten an den server senden
        // aber auch die seite neu lädt, das ist nicht gut darum prefentDefault
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const endpoint = this.state.isLoginMode ? "/api/login" : "/api/register";
        try {
            const data = await this.apiFetch(endpoint, { method: "POST", body: { email, password } });
            if (this.state.isLoginMode) {
                localStorage.setItem("jwt_token", data.access_token);
                this.initializeApp();
            } else {
                this._showToast("Registrierung erfolgreich! Bitte melden Sie sich an.");
                this.toggleAuthMode();
            }
        } catch (error) { this.auth.errorDiv.textContent = error.message; }
    }

    logout() {
        localStorage.removeItem("jwt_token");
        this.views.auth.classList.remove("d-none");
        this.views.app.classList.add("d-none");
        this.auth.navSection.innerHTML = "";
        this.auth.form.reset();
    }

    // --- 3. Main App Initialization ---
    async initializeApp() {
        this.views.auth.classList.add("d-none"); //Login-Maske ausblenden
        this.views.app.classList.remove("d-none"); // App-Ansicht einblenden
        
        //! verstehen
        this.auth.navSection.innerHTML = '';
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-danger';
        logoutBtn.textContent = 'Abmelden';

        // 2. Binden des Verhaltens (der Klick-Logik) an das Element
        logoutBtn.addEventListener('click', () => this.logout());

        // 3. Einhängen des fertigen Elements in den DOM-Baum (macht es sichtbar)
        this.auth.navSection.appendChild(logoutBtn);

        await this.loadAllData(); //dann laden wir alle daten (anfage an server) wir warten bis der server antwortet
        this.updateDashboard("week"); // wir setzen das dashboard auf week und gleichzeigig aktualisieren wir es mit den geladenen daten
    }
   
    //! verstehen
    async loadAllData() {
        const entities = ["foods", "exercisetypes", "consumptionlogs", "activitylogs"];
        const dataLoadingPromises = entities.map(entity => this.loadEntityData(entity));
        dataLoadingPromises.push(this.loadProfileData());
        await Promise.all(dataLoadingPromises); 
    }
    
    async loadEntityData(entity) {
        try {
            const data = await this.apiFetch(`/api/${entity}`);
            this.state[entity] = data;
            const table = document.querySelector(`data-table[entity="${entity}"]`);
            if (table) table.data = data;
        } catch (error) { console.error(`Fehler beim Laden von ${entity}:`, error); }
    }

    async loadProfileData() {
        try {
            const data = await this.apiFetch('/api/profile');
            this.state.profile = data;
            this.profile.gender.value = data.gender || '';
            this.profile.age.value = data.age || '';
            this.profile.height.value = data.height_cm || '';
            this.profile.weight.value = data.weight_kg || '';
            this.profile.startDate.value = data.tracking_start_date || '';
        } catch (error) { console.error("Fehler beim Laden des Profils:", error); }
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        const payload = {
            gender: this.profile.gender.value,
            age: this.profile.age.value ? parseInt(this.profile.age.value, 10) : null,
            height_cm: this.profile.height.value ? parseInt(this.profile.height.value, 10) : null,
            weight_kg: this.profile.weight.value ? parseFloat(this.profile.weight.value) : null,
            tracking_start_date: this.profile.startDate.value || null
        };
        try {
            await this.apiFetch('/api/profile', { method: 'PUT', body: payload });
            this._showToast('Profil erfolgreich gespeichert!');
            await this.loadProfileData();
            this.updateDashboard(this.dashboard.periodSelector.querySelector(".active").dataset.period);
        } catch (error) {
            this._showToast(`Fehler: ${error.message}`, 'danger');
        }
    }

    // --- 4. Dashboard Logic ---
    handlePeriodChange(e) {
        if (e.target.tagName === "BUTTON") {
            this.dashboard.periodSelector.querySelector(".active").classList.remove("active");
            e.target.classList.add("active");
            this.updateDashboard(e.target.dataset.period);
        }
    }

    async updateDashboard(period) {
        try {
            const data = await this.apiFetch(`/api/dashboard?period=${period}`);
            this.dashboard.totalIn.textContent = `${data.total_in} kcal`;
            this.dashboard.totalOut.textContent = `${data.total_out} kcal`;

            const balance = data.balance;
            this.dashboard.totalBalance.textContent = `${balance >= 0 ? '+' : ''}${balance} kcal`;
            this.dashboard.balanceTitle.className = balance >= 0 ? 'text-success' : 'text-danger';
            this.dashboard.totalBalance.className = `fs-2 mb-0 ${balance >= 0 ? 'text-success' : 'text-danger'}`;

            this.renderChart(data);
        } catch (error) { console.error("Fehler beim Aktualisieren des Dashboards:", error); }
    }

    renderChart(data) {
        const ctx = this.dashboard.chartCanvas.getContext("2d");
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Aufgenommen (kcal)",
                        data: data.calories_in,
                        backgroundColor: "rgba(40, 167, 69, 0.6)",
                        borderColor: "#28a745",
                        borderWidth: 1,
                        details: data.details_in,
                    },
                    {
                        label: "Verbraucht (kcal)",
                        data: data.calories_out,
                        backgroundColor: "rgba(220, 53, 69, 0.6)",
                        borderColor: "#dc3545",
                        borderWidth: 1,
                        details: data.details_out,
                    }
                ],
            },
            options: {
                scales: { y: { beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.1)" } }, x: { grid: { color: "rgba(255, 255, 255, 0.1)" } } },
                plugins: {
                    tooltip: {
                        callbacks: {
                            footer: (tooltipItems) => {
                                let footerText = [];
                                tooltipItems.forEach(item => {
                                    const details = item.dataset.details[item.dataIndex];
                                    if (details && details.length > 0) {
                                        footerText.push(...details);
                                    }
                                });
                                return footerText;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 5. Modal & CRUD Logic ---
    openModal(entity, id = null) {
        const form = document.getElementById("modal-form");
        const title = document.getElementById("modal-title");
        
        //! verstehen
        this._clearModalError();

        form.innerHTML = this.getFormFields(entity) + `<div class="modal-error-display alert alert-danger"></div>`
        title.textContent = `${this.getEntityLabel(entity)} ${id ? "bearbeiten" : "hinzufügen"}`;
        
        if (id) {
            const item = this.state[entity].find((i) => i.id == id);
            this.populateForm(item);
        }
        
        document.getElementById("modal-save-btn").onclick = () => this.saveItem(entity, id);
        this.itemModal.show();
    }

    async saveItem(entity, id) {
        const payload = this.getPayloadFromForm(entity);
        if (!payload) return;
        
        const endpoint = id ? `/api/${entity}/${id}` : `/api/${entity}`;
        const method = id ? "PUT" : "POST";
        
        try {
            await this.apiFetch(endpoint, { method, body: payload });
            this.itemModal.hide();
            this._showToast(`${this.getEntityLabel(entity)} erfolgreich gespeichert.`);
            await this.loadEntityData(entity);
            await this.updateDashboard(this.dashboard.periodSelector.querySelector(".active").dataset.period);
        }
        catch (error) {
            this._showModalError(error.message);
        }
    }

    async deleteItem(entity, id) {
        if (confirm(`Sind Sie sicher, dass Sie dieses Element löschen möchten?`)) {
            try {
                await this.apiFetch(`/api/${entity}/${id}`, { method: "DELETE" });
                this._showToast(`${this.getEntityLabel(entity)} wurde gelöscht.`)
                await this.loadEntityData(entity);
                await this.updateDashboard(this.dashboard.periodSelector.querySelector(".active").dataset.period);
            }
            catch (error) {
                this._showToast(`Fehler: ${error.message}`, 'danger');
            }
        }
    }

    // --- 6. Form & Helper Logic ---
    getFormFields(entity) {
        switch (entity) {
            case "foods": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / 100g</label><input type="number" id="form-calories_per_100g" class="form-control" required></div>`;
            case "exercisetypes": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / Stunde</label><input type="number" id="form-calories_per_hour" class="form-control" required></div>`;
            case "consumptionlogs": return `<div class="mb-3"><label class="form-label">Datum</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Nahrungsmittel</label><select id="form-food_id" class="form-select">${this.getSelectOptions("foods")}</select></div><div class="mb-3"><label class="form-label">Menge (g)</label><input type="number" id="form-amount_g" class="form-control" required></div>`;
            case "activitylogs": return `<div class="mb-3"><label class="form-label">Datum</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Bewegung</label><select id="form-exercise_type_id" class="form-select">${this.getSelectOptions("exercisetypes")}</select></div><div class="mb-3"><label class="form-label">Dauer (min)</label><input type="number" id="form-duration_min" class="form-control" required></div>`;
            default: return "";
        }
    }

    populateForm(item) {
        Object.keys(item).forEach((key) => {
            const input = document.getElementById(`form-${key}`);
            if (input) {
                if (key === "log_date" && item[key]) {
                    // Format for datetime-local input
                    input.value = item[key].slice(0, 16);
                } else {
                    input.value = item[key];
                }
            }
        });
    }

    getPayloadFromForm(entity) {
        const payload = {};
        const formFields = {
            foods: ["name", "calories_per_100g"],
            exercisetypes: ["name", "calories_per_hour"],
            consumptionlogs: ["log_date", "food_id", "amount_g"],
            activitylogs: ["log_date", "exercise_type_id", "duration_min"],
        };

        for (const field of formFields[entity]) {
            const input = document.getElementById(`form-${field}`);
            if (!input.value) {
                this._showModalError("Bitte füllen Sie alle Felder aus.");
            }
            
            if (field.includes('_id')) {
                 payload[field] = parseInt(input.value, 10);
            } else if (input.type === "number") {
                 payload[field] = parseFloat(input.value);
            } else if (input.type === 'datetime-local') {
                payload[field] = new Date(input.value).toISOString();
            }
            else {
                 payload[field] = input.value;
            }
        }
        return payload;
    }

    getEntityLabel(entity) {
        const labels = { foods: "Nahrungsmittel", exercisetypes: "Bewegungsform", consumptionlogs: "Konsum", activitylogs: "Aktivität" };
        return labels[entity] || "Element";
    }

    getSelectOptions(entity) {
        return this.state[entity].map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    }


    // --- UI Feedback Helpers ---
    _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }
    _showModalError(message) {
        const errorDisplay = this.itemModal._element.querySelector('.modal-error-display');
        if (errorDisplay) { errorDisplay.textContent = message; errorDisplay.style.display = 'block'; }
    }
    _clearModalError() {
        const errorDisplay = this.itemModal._element.querySelector('.modal-error-display');
        if (errorDisplay) { errorDisplay.textContent = ''; errorDisplay.style.display = 'none'; }
    }

    // --- 7. API Fetch Wrapper ---
    async apiFetch(endpoint, options = {}) {
        const token = localStorage.getItem("jwt_token");
        const headers = { "Content-Type": "application/json", ...options.headers };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (options.body) options.body = JSON.stringify(options.body);

        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, { ...options, headers });
        
        if (response.status === 401) {
            this.logout();
            throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || "Ein API-Fehler ist aufgetreten.");
        }
        return response.status === 204 ? null : response.json();
    }
}

// App-Instanz erstellen
window.app = new FitnessApp();