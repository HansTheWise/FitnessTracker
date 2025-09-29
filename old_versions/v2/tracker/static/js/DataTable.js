class DataTable extends HTMLElement {
    
    // wenn wir ein DataTable element erstellen wird der construktor aufgerufen
    // super() initaliesiert die HTMLElement class von welcher wir geerbt haben und führt dessen constructor aus
    // dann erzeugen wir eine shadowdom damit unser DataTable von Rest des HTML baumes isoliert ist
    // mode: "open" bedeutet das ich von außen immernoch den inhalt des Shadow DOM zugreifen kann (nicht komplett unantastbar)
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    // hier definieren wir auf welches attribut unser browser lauschen/beobachten soll
    // wir packen columns attribut auf unsere watchlist 
    // wir sagen dem Browser: Hey, immer wenn jemand das columns-Attribut dieses Elements im HTML
    // ändert, hinzufügt oder entfernt, sag mir Bescheid,
    // indem du meine attributeChangedCallback-Methode aufrufst
    static get observedAttributes() {
        return ["columns"];
    }

    // wenn das Customelement data-table zum ersten mal in unseren HTML baum geladen wir führen wir diese funktion aus
    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "columns") this._columns = JSON.parse(newValue);
    }

    set data(data) {
        this._data = data;
        this.render();
    }
    
    render() {
        const columns = this._columns || [];
        const data = this._data || [];


        /*
        wir nutzen ein standart table html element und erzeugen für dieses dynamisch den table head mit dem columns array
        indem wir dieses mit der map funktion key-value paar weise auslessen und, 
        für den label key den namen des lables als tablellen kopf zeile einfügen <th> für jede <tr>

        dann für den tbody lesen wir das data array row weise aus in erstellen für jeden datensatz welcher in der row steht ein zeile
        wobei wir der <tr> die id des pk des datensatzes geben.

        dann für die <td> table data nutzen wir wieder das columns array, lessen dieses wieder zeilenweise aus und erstellen für jede column unserer tabelle tabellen daten.
        */

        this.shadowRoot.innerHTML = `
            <style>
                @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
                @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');
                :host {
                    --bs-table-bg: #343a40;
                    --bs-table-striped-bg: #454d55;
                    --bs-table-hover-bg: #4f5861;
                    --bs-table-color: #dee2e6;
                    --bs-table-border-color: #495057;
                }
                .table {
                    background-color: var(--bs-table-bg);
                    color: var(--bs-table-color);
                }
                .btn-action { width: 40px; }
            </style>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            ${columns.map((c) => `<th>${c.label}</th>`).join("")}
                            <th class="text-end">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((row) => `
                            <tr data-id="${row.id}">
                                ${columns.map((c) => `<td>${this.formatCell(c, row[c.key])}</td>`).join("")}
                                <td class="text-end">
                                    <button class="btn btn-sm btn-outline-primary btn-action edit-btn" title="Bearbeiten"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger btn-action delete-btn" title="Löschen"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>`).join("")}
                    </tbody>
                </table>
            </div>`;
        
        // da wir das shadowdomain nutzen um uns zu isolieren müssen wir einen weg finden mit app.js zu kommunizieren 
        // da app.js nicht in das shadow dom hineinschauen kann (ein click event verlässt nie das shadowdom)
        // um das zu umgehen erstellen wir ein custom element mit welchen wir ein nach außen nachrichten an die main app schicken können
        // "edit" und "delete" ist der jeweilige betreff / überschrift
        // detail: = ist der inhalt der nachricht welche wir mit dem event senden, in diesem fall die id der tabellen row in welcher der button gedrückt wurde
        // bubbles: true = Das Event "blubbert" im DOM-Baum nach oben, bis ein passender Listener gefunden wird (der damit was anfangen kann)
        // composed true = ist der pass um das shadowdom verlassen zu dürfen
        // this.dispatchEvent(...) = wir schicken das event los auf eine reise :)
        this.shadowRoot.querySelectorAll(".edit-btn").forEach((btn) => 
            btn.addEventListener("click", (e) => this.dispatchEvent(new CustomEvent("edit", { bubbles: true, composed: true, detail: { id: e.currentTarget.closest("tr").dataset.id } })))
        );
        this.shadowRoot.querySelectorAll(".delete-btn").forEach((btn) => 
            btn.addEventListener("click", (e) => this.dispatchEvent(new CustomEvent("delete", { bubbles: true, composed: true, detail: { id: e.currentTarget.closest("tr").dataset.id } })))
        );
    }

    formatCell(column, value) {
        if (column.format === "datetime" && value) {
            return new Date(value).toLocaleString("de-DE", { dateStyle: 'short', timeStyle: 'short' });
        }
        return value || "";
    }
}

// Definiere das Custom Element, damit der Browser <data-table> versteht.
customElements.define("data-table", DataTable);