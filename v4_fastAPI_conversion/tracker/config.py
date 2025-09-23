from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, model_validator
from typing import Any, Optional

class Settings(BaseSettings):
    """
    Manages application settings using Pydantic.
    Reads settings from environment variables or a .env file,
    providing validation and type casting.
    """
    
    # --- Database Configuration ---
    # We provide default values that match your original Flask config.
    # This satisfies static analysis tools like Pylance and provides a fallback.
    # Pydantic will ALWAYS prioritize values from the .env file.
    DB_USER: str = "postgres"
    DB_PASS: str = "passwordyesyes"
    DB_HOST: str = "localhost"
    DB_NAME: str = "tracker_data"
    
    # This field will be computed automatically by the validator below.
    # We mark it as Optional so Pydantic doesn't require it from the .env file.
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @model_validator(mode='before')
    def assemble_db_connection(cls, v: Any) -> Any:
        """
        Dynamically constructs the database connection string if it's not provided.
        This runs before any other validation, ensuring the URI is always available.
        """
        if isinstance(v, dict) and 'SQLALCHEMY_DATABASE_URI' not in v:
            db_user = v.get('DB_USER', 'postgres')
            db_pass = v.get('DB_PASS', 'password')
            db_host = v.get('DB_HOST', 'localhost')
            db_name = v.get('DB_NAME', 'tracker_data')
            v['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{db_user}:{db_pass}@{db_host}/{db_name}"
        return v

    # --- JWT Security Configuration ---
    JWT_SECRET_KEY: str = "a_very_secret_default_key_with_lots_of_safty!" # It's better to use a non-obvious default
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour

    # Pydantic model configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra="ignore"
    )

# Create a single, globally accessible instance of the settings.
settings = Settings()