import { State_Service } from "../services/State_Service.js";

let _dom;

function get_logs_from_state(entity_name, isoDate) {
          const all_logs = State_Service.get_local_entity(entity_name);
          return all_logs.filter(log => log.log_date.startsWith(isoDate));
}
/**
 * wenn das Flyout Panel für Einträge geöffnet wird, diese Funktion aufrufen, um das Datum des ausgewählten Tages zu aktualisieren / anzuzeigen
 * @param {*} isoDate ist der ausgewählte Tag im ISO-Format (YYYY-MM-DD)
 */
function update_flyout_panel(isoDate) {
          console.log(`Updating Entries Flyout Panel for date ${isoDate}`);

          // Datum formatieren für Anzeige im deutschen Format (DD.MM.YYYY)
          const formatted_date = new Date(isoDate).toLocaleDateString('de-DE',
                    {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                    });
          // Aktualisiere das Datum im Flyout Panel
          _dom.selected_date_display.textContent = formatted_date;

          // Aktive Ansicht bestimmen
          const active_view = _dom.konsum_btn.classList.contains('active') ? 'consumption' : 'activity';

          if (active_view === 'consumption') {
                    // Konsum Logs für das ausgewählte Datum abrufen
                    const data = get_logs_from_state('consumption_logs', isoDate);
                    //! platzhalter text
                    _dom.content_container.innerHTML = `<p>Konsum-Einträge (${data.length} Stück) werden hier gerendert.</p>`;
                    //! renderfunction für konsum logs hier aufrufen
          } else if (active_view === 'activity') {
                    // Aktivitäts Logs für das ausgewählte Datum abrufen
                    const data = get_logs_from_state('activity_logs', isoDate);
                    //! platzhalter text
                    _dom.content_container.innerHTML = `<p>Aktivitäts-Einträge (${data.length} Stück) werden hier gerendert.</p>`;
                    //! renderfunction für aktivitäts logs hier aufrufen
          }
}

function on_date_selected(event) {
          const selected_iso_date = event.detail.isoDate;
          update_flyout_panel(selected_iso_date);
}
//! Initialisierungsfunktion für das Entries Component hier hinzufügen
export const Entries_Component = {};