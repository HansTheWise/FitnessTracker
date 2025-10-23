import { api_fetch, Auth_Error } from '../services/api.js';
import { State_Service } from '../services/State_Service.js';
import { clear_modal_error, show_modal_error, show_toast } from '../ui.js';

let _dom, _update_dashboard;
let choices_instance = null;

function get_entity_label(entity) {
    const labels = {
        foods: "Nahrungsmittel",
        exercise_types: "Bewegungsform",
        consumption_logs: "Konsum",
        activity_logs: "Aktivität"
    };
    return labels[entity] || "Element";
}

function get_modal_form_fields(entity) {
    const foodOptions = State_Service.get_local_entity('foods').map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    const exerciseOptions = State_Service.get_local_entity('exercise_types').map(e => `<option value="${e.id}">${e.name}</option>`).join('');

    switch (entity) {
        case "foods": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div> <div class="mb-3"><label class="form-label">Kalorien / 100g</label><input type="number" id="form-calories_kcal" class="form-control" required></div> <div class="mb-3"><label class="form-label">Protein / 100g</label><input type="number" id="form-protein_per_100g" class="form-control" required></div> <div class="mb-3"><label class="form-label">Kohlenhydrate / 100g</label><input type="number" id="form-carbohydrate_per_100g" class="form-control" required></div>`;
        case "exercise_types": return `<div class="mb-3"><label class="form-label">Name</label><input type="text" id="form-name" class="form-control" required></div><div class="mb-3"><label class="form-label">Kalorien / Stunde</label><input type="number" id="form-calories_per_hour" class="form-control" required></div>`;
        case "consumption_logs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="date" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Nahrungsmittel</label><select id="form-food_id" class="form-select">${foodOptions}</select></div><div class="mb-3"><label class="form-label">Menge (g)</label><input type="number" id="form-amount_g" class="form-control" required></div>`;
        case "activity_logs": return `<div class="mb-3"><label class="form-label">Datum & Uhrzeit</label><input type="date" id="form-log_date" class="form-control" required></div><div class="mb-3"><label class="form-label">Bewegung</label><select id="form-exercise_type_id" class="form-select">${exerciseOptions}</select></div><div class="mb-3"><label class="form-label">Dauer (min)</label><input type="number" id="form-duration_min" class="form-control" required></div>`;
        default: return "";
    }
}

function get_payload_from_modal(entity) {
    const fields = {
        foods: ["name", "calories_kcal"],
        exercise_types: ["name", "calories_per_hour"],
        consumption_logs: ["log_date", "food_id", "amount_g"],
        activity_logs: ["log_date", "exercise_type_id", "duration_min"]
    };
    const payload = {};
    for (const field of fields[entity]) {
        const input = document.getElementById(`form-${field}`);
        if (!input || !input.value) {
            show_modal_error(_dom.modal.element, "Bitte füllen Sie alle Felder aus.");
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

async function save_item(entity, id) {
    const payload = get_payload_from_modal(entity);
    if (!payload) return;

    const endpoint = `/api/${entity}` + (id ? `/${id}` : '');
    const method = id ? "PUT" : "POST";

    try {
        const saved_item = await api_fetch(endpoint, { method, body: payload });
        _dom.modal.instance.hide();

        if (id) {
            State_Service.update_local_item(entity, saved_item);
        } else {
            State_Service.add_local_item(entity, saved_item);
        }
        
        // KORREKTUR: Rufen Sie die populate-Funktion erneut auf, um die Tabelle zu aktualisieren
        populate_table(entity);

        show_toast(_dom.toast_container, `${get_entity_label(entity)} erfolgreich gespeichert.`);
        _update_dashboard(document.querySelector("#period-selector .active").dataset.period);

    } catch (error) {
        if (error instanceof Auth_Error) return window.app.logout();
        show_modal_error(_dom.modal.element, error.message);
    }
}

async function delete_item(entity, id) {
    const label = get_entity_label(entity);
    _dom.modal.confirm_message.textContent = `Sind Sie sicher, dass Sie "${label}" löschen möchten?`;
    
    const confirm_handler = async () => {
        try {
            await api_fetch(`/api/${entity}/${id}`, { method: "DELETE" });
            State_Service.delete_local_item(entity, id);
            
            // KORREKTUR: Rufen Sie die populate-Funktion erneut auf, um die Tabelle zu aktualisieren
            populate_table(entity);

            show_toast(_dom.toast_container, `${label} wurde gelöscht.`);
            _update_dashboard(document.querySelector("#period-selector .active").dataset.period);
        } catch (error) {
            if (error instanceof Auth_Error) return window.app.logout();
            show_toast(_dom.toast_container, `Fehler: ${error.message}`, 'danger');
        }
        _dom.modal.confirm.hide();
    };

    const new_confirm_button = _dom.modal.confirm_button.cloneNode(true);
    _dom.modal.confirm_button.parentNode.replaceChild(new_confirm_button, _dom.modal.confirm_button);
    _dom.modal.confirm_button = new_confirm_button;

    _dom.modal.confirm_button.addEventListener("click", confirm_handler, { once: true });
    _dom.modal.confirm.show();
}

function open_modal(entity, id = null) {
    if (choices_instance) choices_instance.destroy();
    clear_modal_error(_dom.modal.element);
    
    _dom.modal.form.innerHTML = get_modal_form_fields(entity);
    _dom.modal.title.textContent = `${get_entity_label(entity)} ${id ? "bearbeiten" : "hinzufügen"}`;

    if (!id) {
        const date_input = document.getElementById('form-log_date');
        if (date_input) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            date_input.value = now.toISOString().slice(0, 10);
        }
    }
    
    const select_element = _dom.modal.form.querySelector('select');
    if (select_element) {
        choices_instance = new Choices(select_element, { searchPlaceholderValue: 'Suchen...', itemSelectText: 'Auswählen', shouldSort: false });
    }

    if (id) {
        const item = State_Service.get_local_entity(entity).find(i => i.id == id);
        if (item) {
            Object.keys(item).forEach(key => {
                const input = document.getElementById(`form-${key}`);
                if (input) {
                    if (input.tagName === 'SELECT' && choices_instance) {
                        choices_instance.setChoiceByValue(String(item[key]));
                    } else if (input.type === "date" && item[key]) {
                        const date = new Date(item[key]);
                        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                        input.value = date.toISOString().slice(0, 10);
                    } else {
                        input.value = item[key];
                    }
                }
            });
        }
    }

    _dom.modal.save_button.onclick = () => save_item(entity, id);
    _dom.modal.instance.show();
}

// KORREKTUR: Die populateTable-Funktion wird außerhalb von init deklariert, damit sie wiederverwendbar ist
function populate_table(entity_name) {
    const table = document.querySelector(`data-table[entity="${entity_name}"]`);
    if (table) {
        console.log(`fülle tabelle mit "${entity_name}"`);
        table.data = State_Service.get_local_entity(entity_name);
    }
}

export const Entity_Management_Component = {
    init: (dom, update_dashboard_callback) => {
        _dom = dom;
        _update_dashboard = update_dashboard_callback;

        ['foods', 'exercise_types', 'consumption_logs', 'activity_logs'].forEach(populate_table);
        document.querySelectorAll('[data-action="open-modal"]').forEach(button => {
            button.addEventListener('click', () => open_modal(button.dataset.entity));
        });
        
        document.querySelectorAll("data-table").forEach((table) => {
            const entity = table.getAttribute("entity");
            table.addEventListener("edit", (e) => open_modal(entity, e.detail.id));
            table.addEventListener("delete", (e) => delete_item(entity, e.detail.id));
        });

        console.log("EntityManagementComponent initialized.");
    }
};
