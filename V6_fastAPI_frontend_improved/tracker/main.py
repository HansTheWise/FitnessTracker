from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Import router modules from the subdirectories
from tracker.auth import auth_routes
from .api import api_routes

# Import database components and models
from .database import engine
from .models import entity_models, user_models

# Create database tables if they don't exist
# This replaces the db.create_all() from the old Flask app factory.
user_models.Base.metadata.create_all(bind=engine)
entity_models.Base.metadata.create_all(bind=engine)

# Initialize the main FastAPI application
app = FastAPI(
    title="Fitness Tracker API",
    description="API for the Fitness Tracker application, migrated from Flask to FastAPI.",
    version="1.0.0"
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

# --- API Router Configuration ---
# Include the routers from the auth and api modules.
# All routes will be prefixed with /api, just like in the Flask version.
app.include_router(auth_routes.router, prefix="/api", tags=["Authentication"])
app.include_router(api_routes.router, prefix="/api", tags=["API"])

# --- Static Files and Frontend ---
# Mount the 'static' directory to serve JavaScript, CSS, etc.
app.mount("/static", StaticFiles(directory="tracker/static"), name="static")
app.mount("/templates", StaticFiles(directory="tracker/templates"), name="templates")


@app.get("/", response_class=FileResponse, include_in_schema=False)
async def read_root():
    """
    Serves the main index.html file for the single-page application.
    """
    return "tracker/templates/index.html"