from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from .models import base_model
from .models import entity_models

# Import router modules from the subdirectories
from tracker.auth import auth_routes
from .api import api_routes

# Import database components and models
from .database import engine
from .models import user_models
from contextlib import asynccontextmanager


@asynccontextmanager # decorator damit FastAPI die Funktion als Lifespan-Manager erkennt
async def lifespan(app: FastAPI):
    # Code vor yield: wird ausgeführt, sobald Uvicorn gestartet wird
    print("Server starting up...")
    # Öffnet sichere, transaktionale Verbindung zur Datenbank. 
    # async with: garantiert, dass die Verbindung am Ende sauber geschlossen wird.
    # .begin(): stellt sicher, dass alle Befehle darin als eine "Alles-oder-Nichts"-Operation ablaufen.
    async with engine.begin() as conn:  # async with: sichert sauberes schließen der verbindung
        # .begin() stellt sicher, dass alle Befehle darin als eine "Alles-oder-Nichts"-Operation ablaufen
        await conn.run_sync(base_model.Base.metadata.create_all)
        # nimmt den kompletten Bauplan aller Tabellen aus deinen models.py
        # weist die Datenbank an (.create_all), alle Tabellen zu erstellen, die noch nicht existieren
    print("Database is ready.")
    yield # fastapi anwendung wird ausgeführt, wenn der server beendet(Uvicorn heruntergefahren) wird geht es nach yield weiter
    # lifespan funktion is yielding 
    print("Server shutting down.")

# Initialize the main FastAPI application
app = FastAPI(
    title="Fitness Tracker API",
    description="API for the Fitness Tracker application, migrated from Flask to FastAPI.",
    version="1.0.0",
    lifespan=lifespan
)

# --- Middleware Configuration ---
# Add CORS middleware to allow cross-origin requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER REGISTRIERUNG ---
# Hier wird die "Personalabteilung" an die "Zentrale" angeschlossen.
# FastAPI weiß jetzt von /api/register und /api/login.
app.include_router(auth_routes.router)

# Hier wird die "Abteilung für Entitäten" angeschlossen.
# FastAPI weiß jetzt von /api/entities/foods etc.
app.include_router(api_routes.router)

# --- Statische Dateien und Frontend ---
# Binde statische Dateien ein (falls du welche hast)
app.mount("/static", StaticFiles(directory="tracker/static"), name="static")
app.mount("/templates", StaticFiles(directory="tracker/templates"), name="templates")

# Hauptroute die das Frontend ausliefert.
@app.get("/", response_class=FileResponse, include_in_schema=False)
async def read_root():
    """
    Liefert die Haupt-index.html-Datei für die Single-Page Application aus.
    """
    return "tracker/templates/index.html"
