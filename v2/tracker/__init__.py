from flask import Flask, render_template
from .extensions import db, jwt
from .config import DevelopmentConfig

def create_app(config_object=DevelopmentConfig):
    """
    Application Factory: Erstellt und konfiguriert die Flask-Anwendung.
    """
    # Wichtig: template_folder muss relativ zum Blueprint oder zur App sein
    app = Flask(__name__.split('.')[0], instance_relative_config=True, template_folder='templates')
    app.config.from_object(config_object)
    
    # Initialisiere die Erweiterungen mit der App
    db.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        # Importiere die Modelle, damit create_all sie findet
        from .models import user_models, tracking_models

        # Importiere die Blueprints
        from .auth.routes import auth_bp
        from .api.routes import api_bp

        # Registriere die Blueprints und hängt die neuen abteile an den prefix url dran
        app.register_blueprint(auth_bp, url_prefix='/api')
        app.register_blueprint(api_bp, url_prefix='/api')
        
        # Erstelle die Datenbanktabellen durch die importieren blueprints, falls sie noch nicht existieren
        db.create_all()

    # Route für die Startseite bleibt hier, da sie zur Haupt-App gehört
    @app.route('/')
    def index():
        return render_template('index.html')

    return app
