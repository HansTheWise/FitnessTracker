import os
from datetime import timedelta

class Config:
    """Basis-Konfigurationsklasse."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ein-sehr-geheimer-schluessel')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)


class DevelopmentConfig(Config):
    """Konfiguration für die Entwicklungsumgebung."""
    DEBUG = True
    
    # Datenbank-Konfiguration aus Umgebungsvariablen oder mit Fallback-Werten
    DB_USER = os.environ.get('DB_USER', 'postgres')  
    DB_PASS = os.environ.get('DB_PASS', 'KaterMax007')   
    DB_HOST = os.environ.get('DB_HOST', 'localhost')  
    DB_NAME = os.environ.get('DB_NAME', 'tracker_data')
    
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', '1234')