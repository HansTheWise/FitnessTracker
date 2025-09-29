from tracker import create_app
from tracker.config import DevelopmentConfig

# Erstellt die App-Instanz mit der Entwicklungskonfiguration
app = create_app(DevelopmentConfig)

if __name__ == '__main__':
    # Führt die App aus
    # Wichtig: "with app.app_context()" ist hier nicht mehr nötig,
    # da db.create_all() jetzt in der Factory aufgerufen wird.
    app.run(debug=True, port=5001)