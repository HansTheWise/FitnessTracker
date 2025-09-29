import { apiFetch, AuthError } from '../services/api.js';
import { StateService } from '../services/StateService.js';
import { clearModalError, showModalError, showToast } from '../ui.js';

let _dom, _updateDashboard;
let choicesInstance = null;

function getEntityLabel(entity) {
    const labels = {
        foods: "Nahrungsmittel",
        exercisetypes: "Bewegungsform",
        consumptionlogs: "Konsum",
        activitylogs: "Aktivität"
    };
    return labels[entity] || "Element";
}

function getFormFields(entity) {
    const foodOptions = StateService.getEntity('foods').map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    const exerciseOptions = StateService.getEntity('exercisetypes').map(e => `<option value="${e.id}">${e.name}</option>`).join('');

    switch (entity) {
        case "foods": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / 100g</label><input type="number" id="form-calories_per_100g" class="form-control" required></div>`;
        case "exercisetypes": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / Stunde</label><input type="number" id="form-calories_per_hour" class="form-control" required></div>`;
        case "consumptionlogs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Nahrungsmittel</label><select id="form-food_id" class="form-select">${foodOptions}</select></div><div class="mb-3"><label class="form-label">Menge (g)</label><input type="number" id="form-amount_g" class="form-control" required></div>`;
        case "activitylogs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="datetime-local" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Bewegung</label><select id="form-exercise_type_id" class="form-select">${exerciseOptions}</select></div><div class="mb-3"><label class="form-label">Dauer (min)</label><input type="number" id="form-duration_min" class="form-control" required></div>`;
        default: return "";
    }
}

function getPayloadFromModal(entity) {
    const fields = {
        foods: ["name", "calories_per_100g"],
        exercisetypes: ["name", "calories_per_hour"],
        consumptionlogs: ["log_date", "food_id", "amount_g"],
        activitylogs: ["log_date", "exercise_type_id", "duration_min"]
    };
    const payload = {};
    for (const field of fields[entity]) {
        const input = document.getElementById(`form-${field}`);
        if (!input || !input.value) {
            showModalError(_dom.modal.element, "Bitte füllen Sie alle Felder aus.");
            return null;
        }
        if (field.includes('_id') || input.type === "number") {
            payload[field] = parseFloat(input.value);
        } else {
            payload[field] = input.value;
        }
    }
    return payload;
}

async function saveItem(entity, id) {
    const payload = getPayloadFromModal(entity);
    if (!payload) return;

    const endpoint = `/api/${entity}` + (id ? `/${id}` : '');
    const method = id ? "PUT" : "POST";

    try {
        const savedItem = await apiFetch(endpoint, { method, body: payload });
        _dom.modal.instance.hide();

        if (id) {
            StateService.updateItem(entity, savedItem);
        } else {
            StateService.addItem(entity, savedItem);
        }
        
        // KORREKTUR: Rufen Sie die populate-Funktion erneut auf, um die Tabelle zu aktualisieren
        populateTable(entity);

        showToast(_dom.toastContainer, `${getEntityLabel(entity)} erfolgreich gespeichert.`);
        _updateDashboard(document.querySelector("#period-selector .active").dataset.period);

    } catch (error) {
        if (error instanceof AuthError) return window.app.logout();
        showModalError(_dom.modal.element, error.message);
    }
}

async function deleteItem(entity, id) {
    const label = getEntityLabel(entity);
    _dom.modal.confirmMessage.textContent = `Sind Sie sicher, dass Sie "${label}" löschen möchten?`;
    
    const confirmHandler = async () => {
        try {
            await apiFetch(`/api/${entity}/${id}`, { method: "DELETE" });
            StateService.deleteItem(entity, id);
            
            // KORREKTUR: Rufen Sie die populate-Funktion erneut auf, um die Tabelle zu aktualisieren
            populateTable(entity);

            showToast(_dom.toastContainer, `${label} wurde gelöscht.`);
            _updateDashboard(document.querySelector("#period-selector .active").dataset.period);
        } catch (error) {
            if (error instanceof AuthError) return window.app.logout();
            showToast(_dom.toastContainer, `Fehler: ${error.message}`, 'danger');
        }
        _dom.modal.confirm.hide();
    };

    const newConfirmBtn = _dom.modal.confirmBtn.cloneNode(true);
    _dom.modal.confirmBtn.parentNode.replaceChild(newConfirmBtn, _dom.modal.confirmBtn);
    _dom.modal.confirmBtn = newConfirmBtn;

    _dom.modal.confirmBtn.addEventListener("click", confirmHandler, { once: true });
    _dom.modal.confirm.show();
}

function openModal(entity, id = null) {
    if (choicesInstance) choicesInstance.destroy();
    clearModalError(_dom.modal.element);
    
    _dom.modal.form.innerHTML = getFormFields(entity);
    _dom.modal.title.textContent = `${getEntityLabel(entity)} ${id ? "bearbeiten" : "hinzufügen"}`;

    if (!id) {
        const dateInput = document.getElementById('form-log_date');
        if (dateInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dateInput.value = now.toISOString().slice(0, 16);
        }
    }
    
    const selectElement = _dom.modal.form.querySelector('select');
    if (selectElement) {
        choicesInstance = new Choices(selectElement, { searchPlaceholderValue: 'Suchen...', itemSelectText: 'Auswählen', shouldSort: false });
    }

    if (id) {
        const item = StateService.getEntity(entity).find(i => i.id == id);
        if (item) {
            Object.keys(item).forEach(key => {
                const input = document.getElementById(`form-${key}`);
                if (input) {
                    if (input.tagName === 'SELECT' && choicesInstance) {
                        choicesInstance.setChoiceByValue(String(item[key]));
                    } else if (input.type === "datetime-local" && item[key]) {
                        const date = new Date(item[key]);
                        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                        input.value = date.toISOString().slice(0, 16);
                    } else {
                        input.value = item[key];
                    }
                }
            });
        }
    }

    _dom.modal.saveBtn.onclick = () => saveItem(entity, id);
    _dom.modal.instance.show();
}

// KORREKTUR: Die populateTable-Funktion wird außerhalb von init deklariert, damit sie wiederverwendbar ist
function populateTable(entityName) {
    const table = document.querySelector(`data-table[entity="${entityName}"]`);
    if (table) {
        console.log(`fülle tabelle mit "${entityName}"`);
        table.data = StateService.getEntity(entityName);
    }
}

export const EntityManagementComponent = {
    init: (dom, updateDashboardCallback) => {
        _dom = dom;
        _updateDashboard = updateDashboardCallback;

        ['foods', 'exercisetypes', 'consumptionlogs', 'activitylogs'].forEach(populateTable);
        document.querySelectorAll('[data-action="open-modal"]').forEach(button => {
            button.addEventListener('click', () => openModal(button.dataset.entity));
        });
        
        document.querySelectorAll("data-table").forEach((table) => {
            const entity = table.getAttribute("entity");
            table.addEventListener("edit", (e) => openModal(entity, e.detail.id));
            table.addEventListener("delete", (e) => deleteItem(entity, e.detail.id));
        });

        console.log("EntityManagementComponent initialized.");
    }
};
