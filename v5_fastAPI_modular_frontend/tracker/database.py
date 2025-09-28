from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

if not settings.SQLALCHEMY_DATABASE_URI:
    raise ValueError("Die Datenbank-URL (SQLALCHEMY_DATABASE_URI) ist nicht konfiguriert. Bitte überprüfen Sie Ihre .env-Datei.")

# Create the SQLAlchemy engine using the database URI from settings
# The pool_pre_ping is a good practice to check connections before handing them out
engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI), 
    pool_pre_ping=True
)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class for our models to inherit from
Base = declarative_base()

# Dependency to get a DB session for each request
def get_db():
    """
    FastAPI dependency that provides a database session per request.
    It ensures that the database session is always closed after the request,
    even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
