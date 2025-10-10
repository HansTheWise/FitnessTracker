from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Verwaltet die Anwendungseinstellungen mit Pydantic.
    Liest Umgebungsvariablen automatisch aus einer .env-Datei.
    """
    SQLALCHEMY_DATABASE_URI: str = "sqlite+aiosqlite:///./database.db"

    # --- JWT Authentifizierungs-Einstellungen ---
    # Der geheime Schlüssel zum Signieren von JWTs. Sollte lang und zufällig sein.
    JWT_SECRET_KEY: str = "please_change_me_in_production"
    
    # Der Algorithmus, der für die JWT-Signatur verwendet wird (z.B. "HS256").
    JWT_ALGORITHM: str = "HS256"
    
    # Die Lebensdauer des Zugriffstokens in Minuten.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Pydantic-Konfiguration, die angibt, nach einer .env-Datei zu suchen.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False, # Liest Variablen unabhängig von Groß-/Kleinschreibung
        extra='ignore' 
    )


# Erstellt eine einzige, global zugängliche Instanz der Einstellungen.
# Dieses `settings`-Objekt wirst du in anderen Teilen deiner Anwendung importieren.
settings = Settings()
